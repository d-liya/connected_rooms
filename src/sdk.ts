/** Capybara game services. Import { sdk } from './sdk'.
 * Lazy CDN loading; window.gameId is injected by the host. Local play needs no SDK.
 * Multiplayer is versioned room state: HTTP reads/writes plus live socket push
 * and ephemeral messages when the loaded client supports realtime.
 */
export type State = Record<string, unknown>;
export type User = { id: string; name: string; isAnonymous?: boolean | null };
export type Player = { userId: string; joinedAt: string; metadata: State };
export type RoomMessage = {
  event: string;
  data: unknown;
  from: string;
  at: string;
};
export type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";
type Snapshot = { state: State; version: number };
type RealtimeRoom = {
  connectionState: ConnectionState;
  waitForReady(): Promise<{
    state: Snapshot;
    presence: { players: Player[] };
  }>;
  onState(handler: (snapshot: Snapshot) => void): () => void;
  onPresence(handler: (presence: { players: Player[] }) => void): () => void;
  onMessage(handler: (message: RoomMessage) => void): () => void;
  onConnection(handler: (state: ConnectionState) => void): () => void;
  onError(handler: (error: unknown) => void): () => void;
  send(event: string, data?: unknown): void;
  close(): void;
};
type Options = {
  baseUrl?: string;
  tokenStorageKey?: string;
  bearerToken?: string;
  publishableKey?: string;
};
type Client = {
  getSession(): Promise<{ user: User } | null>;
  signInGuest(): Promise<{ user: User }>;
  signOut(): Promise<unknown>;
  authWithEmailOtp(input: {
    email: string;
    otp?: string;
    name?: string;
  }): Promise<{ user?: User; stage?: string; email?: string }>;
  getSave(gameId: string): Promise<{ data: State }>;
  updateSave(gameId: string, data: State): Promise<unknown>;
  getSharedState(gameId: string): Promise<{ data: State | null }>;
  updateSharedState(gameId: string, data: State): Promise<unknown>;
  getKv<T>(gameId: string, key: string): Promise<{ value: T }>;
  setKv<T>(gameId: string, key: string, value: T): Promise<unknown>;
  deleteKv(gameId: string, key: string): Promise<unknown>;
  joinRoom(
    gameId: string,
    roomId: string,
    metadata: State,
  ): Promise<{ state: Snapshot }>;
  leaveRoom(gameId: string, roomId: string): Promise<unknown>;
  getRoomState(gameId: string, roomId: string): Promise<Snapshot>;
  updateRoomState(
    gameId: string,
    roomId: string,
    state: State,
    version: number,
  ): Promise<Snapshot>;
  getRoomPresence(
    gameId: string,
    roomId: string,
  ): Promise<{ players: Player[] }>;
  startPlaytimeTracking(gameId: string): unknown;
  /** Absent on older cached clients; the SDK then stays on HTTP + polling. */
  connectRoom?(
    gameId: string,
    roomId: string,
    options?: { metadata?: State },
  ): RealtimeRoom;
};
type Host = {
  gameId?: string;
  GameServerClient?: new (options?: Options) => Client;
};
let scriptLoad: Promise<void> | undefined;
function loadClient(): Promise<void> {
  if (!scriptLoad)
    scriptLoad = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://assets.capybara.build/js/game-api-client.6915fc035020.js";
      script.async = true;
      const timeout = setTimeout(() => {
        script.remove();
        scriptLoad = undefined;
        reject(new Error("Game services timed out. Retry."));
      }, 15000);
      script.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timeout);
        script.remove();
        scriptLoad = undefined;
        reject(new Error("Game services unavailable. Retry."));
      };
      document.head.appendChild(script);
    });
  return scriptLoad;
}
const status = (error: unknown) =>
  Number((error as { status?: number })?.status);
export function createGameSDK(providedHost?: Host) {
  let client: Client | undefined,
    gameId = "",
    session: Promise<User> | undefined,
    analytics = false;
  let room: string | null = null,
    version = 0,
    roomEpoch = 0,
    queue: Promise<unknown> = Promise.resolve();
  let live: RealtimeRoom | null = null,
    liveRoom: string | null = null;
  const liveStateHandlers = new Set<(snapshot: Snapshot) => void>(),
    liveMessageHandlers = new Set<(message: RoomMessage) => void>(),
    livePlayerHandlers = new Set<(players: Player[]) => void>(),
    liveConnectionHandlers = new Set<(state: ConnectionState) => void>();
  const host = () => providedHost ?? (window as unknown as Host);
  async function init(options?: Options) {
    if (client) return client;
    const env = host();
    if (!env.gameId)
      throw new Error(
        "Hosted game ID is missing. Online features require a configured game.",
      );
    if (!env.GameServerClient) await loadClient();
    if (!env.GameServerClient)
      throw new Error("Game service client did not load.");
    gameId = env.gameId;
    return (client ??= new env.GameServerClient(options));
  }
  async function currentUser(): Promise<User | null> {
    const api = await init();
    try {
      return (await api.getSession())?.user ?? null;
    } catch (error) {
      if (status(error) === 401 || status(error) === 403) return null;
      throw error;
    }
  }
  async function ensureGuestSession(): Promise<User> {
    if (!session)
      session = (async () => {
        const api = await init();
        return (await currentUser()) ?? (await api.signInGuest()).user;
      })().catch((error) => {
        session = undefined;
        throw error;
      });
    return session;
  }
  async function authorized() {
    const api = await init();
    await ensureGuestSession();
    return api;
  }
  function serial<T>(operation: () => Promise<T>): Promise<T> {
    const pending = queue.then(operation, operation);
    queue = pending.catch(() => {});
    return pending;
  }
  function requireRoom() {
    if (!room) throw new Error("Join a room first.");
    return room;
  }
  async function missing<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (status(error) === 404) return null;
      throw error;
    }
  }
  function fanout<T>(handlers: Set<(value: T) => void>, value: T) {
    handlers.forEach((handler) => {
      try {
        handler(value);
      } catch {}
    });
  }
  function detachLive() {
    if (live) {
      try {
        live.close();
      } catch {}
      live = null;
      liveRoom = null;
    }
  }
  function attachLive(api: Client, id: string, metadata: State) {
    detachLive();
    if (typeof api.connectRoom !== "function") return;
    let handle: RealtimeRoom;
    try {
      handle = api.connectRoom(gameId, id, { metadata });
    } catch {
      return;
    }
    const myEpoch = roomEpoch;
    const current = () =>
      live === handle && room === id && roomEpoch === myEpoch;
    live = handle;
    liveRoom = id;
    let everOpen = false;
    handle.onState((snapshot) => {
      if (!current()) return;
      if (snapshot.version >= version) {
        version = snapshot.version;
        fanout(liveStateHandlers, {
          state: snapshot.state,
          version: snapshot.version,
        });
      }
    });
    handle.onMessage((message) => {
      if (current()) fanout(liveMessageHandlers, message);
    });
    handle.onPresence((presence) => {
      if (current()) fanout(livePlayerHandlers, presence.players);
    });
    handle.onConnection((conn) => {
      if (!current()) return;
      fanout(liveConnectionHandlers, conn);
      if (conn === "open" && everOpen) {
        // Reconnected after a drop; resync anything missed while offline.
        void serial(async () => {
          if (!current()) return;
          try {
            const latest = await api.getRoomState(gameId, id);
            if (!current()) return;
            if (latest.version > version) {
              version = latest.version;
              fanout(liveStateHandlers, {
                state: latest.state,
                version: latest.version,
              });
            }
          } catch {}
        });
      }
      if (conn === "open") everOpen = true;
    });
    handle.waitForReady().catch(() => {
      if (live === handle) detachLive();
    });
  }
  const multiplayer = {
    joinRoom: (id: string, metadata: State = {}) =>
      serial(async () => {
        if (!id.trim()) throw new Error("Enter a room code.");
        const api = await authorized();
        if (room && room !== id) await api.leaveRoom(gameId, room);
        detachLive();
        room = null;
        version = 0;
        roomEpoch++;
        const joined = await api.joinRoom(gameId, id, metadata);
        room = id;
        version = joined.state.version;
        attachLive(api, id, metadata);
        // Let the socket get ready so send() works right after joining.
        // Bounded and best-effort: slow/failed sockets fall back to HTTP.
        const handle = live;
        if (handle) {
          await Promise.race([
            handle.waitForReady().then(
              () => {},
              () => {},
            ),
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]);
        }
        return joined.state.state;
      }),
    leaveRoom: () =>
      serial(async () => {
        if (!room) return;
        detachLive();
        await (await authorized()).leaveRoom(gameId, room);
        room = null;
        version = 0;
        roomEpoch++;
      }),
    getRoomState: () =>
      serial(async () => {
        const id = requireRoom(),
          api = await authorized();
        const latest = await api.getRoomState(gameId, id);
        version = latest.version;
        return latest.state;
      }),
    updateRoomState: (state: State) =>
      serial(async () => {
        const id = requireRoom(),
          api = await authorized();
        // 409 propagates. Fetch and recompute; never blindly replay a stale replacement.
        const updated = await api.updateRoomState(gameId, id, state, version);
        version = updated.version;
        return updated.state;
      }),
    getRoomPlayers: () =>
      serial(async () => {
        const id = requireRoom();
        return (await (await authorized()).getRoomPresence(gameId, id)).players;
      }),
    /** Subscribe after joining. One request at a time; stops on error, leave or room change.
     * Return cleanup from React useEffect. On 409 fetch/recompute; on 429 wait before retrying.
     * Uses live socket push when connected (falling back to polling if the
     * socket drops), otherwise polls every intervalMs.
     */
    subscribe: (
      onState: (state: State) => void,
      onError: (error: unknown) => void,
      intervalMs = 1000,
    ) => {
      const subscribedRoom = requireRoom(),
        subscribedEpoch = roomEpoch;
      let stopped = false,
        timer: ReturnType<typeof setTimeout> | undefined;
      const active = () =>
        !stopped && room === subscribedRoom && roomEpoch === subscribedEpoch;
      const fail = (error: unknown) => {
        if (!stopped) {
          stopped = true;
          onError(error);
        }
      };
      const poll = async () => {
        try {
          if (!active()) return;
          const state = await multiplayer.getRoomState();
          if (!active()) return;
          onState(state);
          timer = setTimeout(poll, Math.max(1000, intervalMs));
        } catch (error) {
          fail(error);
        }
      };
      const cleanups: Array<() => void> = [];
      const stop = () => {
        stopped = true;
        if (timer) clearTimeout(timer);
        while (cleanups.length) cleanups.pop()!();
      };
      if (live && liveRoom === subscribedRoom) {
        const handle = live;
        let primed = false;
        const latest: { snapshot: Snapshot | null } = { snapshot: null };
        const onPush = (snapshot: Snapshot) => {
          if (!active()) return;
          if (!primed) {
            latest.snapshot = snapshot;
            return;
          }
          onState(snapshot.state);
        };
        liveStateHandlers.add(onPush);
        cleanups.push(() => {
          liveStateHandlers.delete(onPush);
        });
        cleanups.push(
          handle.onConnection((conn) => {
            if (conn === "closed" && active()) {
              primed = true;
              void poll();
            }
          }),
        );
        void (async () => {
          try {
            const state = await multiplayer.getRoomState();
            if (!active()) return;
            primed = true;
            onState(state);
            if (latest.snapshot && latest.snapshot.version > version) {
              version = latest.snapshot.version;
              onState(latest.snapshot.state);
            }
          } catch (error) {
            fail(error);
          }
        })();
        return stop;
      }
      void poll();
      return stop;
    },
    /** Ephemeral broadcast to room members (input, positions, chat). Not persisted. */
    send: (event: string, data: unknown = null) => {
      const id = requireRoom();
      if (!live || liveRoom !== id)
        throw new Error(
          "Realtime is not connected. joinRoom connects automatically when supported.",
        );
      live.send(event, data);
    },
    onMessage: (handler: (message: RoomMessage) => void) => {
      liveMessageHandlers.add(handler);
      return () => {
        liveMessageHandlers.delete(handler);
      };
    },
    onPlayers: (handler: (players: Player[]) => void) => {
      livePlayerHandlers.add(handler);
      return () => {
        livePlayerHandlers.delete(handler);
      };
    },
    onConnection: (handler: (state: ConnectionState) => void) => {
      liveConnectionHandlers.add(handler);
      try {
        handler(live && liveRoom === room ? live.connectionState : "closed");
      } catch {}
      return () => {
        liveConnectionHandlers.delete(handler);
      };
    },
  };
  return {
    init,
    async enableAnalytics() {
      if (!host().gameId || analytics) return;
      const api = await authorized();
      if (!analytics) {
        api.startPlaytimeTracking(gameId);
        analytics = true;
      }
    },
    auth: {
      getCurrentUser: currentUser,
      ensureGuestSession,
      loginAsGuest: ensureGuestSession,
      sendLoginEmail: async (email: string) => {
        await (await init()).authWithEmailOtp({ email });
      },
      verifyLoginEmail: async (email: string, otp: string, name?: string) => {
        await multiplayer.leaveRoom();
        const result = await (
          await init()
        ).authWithEmailOtp({ email, otp, name });
        if (!result.user) throw new Error("Sign-in did not return a user.");
        session = Promise.resolve(result.user);
        return result.user;
      },
      logout: async () => {
        await multiplayer.leaveRoom();
        await (await init()).signOut();
        session = undefined;
      },
    },
    save: {
      loadGameData: async () => {
        const api = await authorized();
        return missing(async () => (await api.getSave(gameId)).data);
      },
      saveGameData: async (data: State) => {
        await (await authorized()).updateSave(gameId, data);
      },
      loadSharedState: async () => {
        const api = await authorized();
        return (await api.getSharedState(gameId)).data;
      },
      saveSharedState: async (data: State) => {
        await (await authorized()).updateSharedState(gameId, data);
      },
    },
    storage: {
      get: async <T = unknown>(key: string) => {
        const api = await authorized();
        return missing(async () => (await api.getKv<T>(gameId, key)).value);
      },
      set: async <T>(key: string, value: T) => {
        await (await authorized()).setKv(gameId, key, value);
      },
      delete: async (key: string) => {
        await (await authorized()).deleteKv(gameId, key);
      },
    },
    multiplayer,
  };
}
export const sdk = createGameSDK();
