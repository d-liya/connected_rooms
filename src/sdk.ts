/** Capybara game services. Import { sdk } from './sdk'.
 * Lazy CDN loading; window.gameId is injected by the host. Local play needs no SDK.
 * Multiplayer is versioned HTTP room state, not lockstep/rollback networking.
 */
export type State = Record<string, unknown>;
export type User = { id: string; name: string; isAnonymous?: boolean | null };
export type Player = { userId: string; joinedAt: string; metadata: State };
type Snapshot = { state: State; version: number };
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
  }): Promise<{ user?: User }>;
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
      script.src = "https://assets.capybara.build/js/game-api-client.js";
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
  const multiplayer = {
    joinRoom: (id: string, metadata: State = {}) =>
      serial(async () => {
        if (!id.trim()) throw new Error("Enter a room code.");
        const api = await authorized();
        if (room && room !== id) await api.leaveRoom(gameId, room);
        room = null;
        version = 0;
        roomEpoch++;
        const joined = await api.joinRoom(gameId, id, metadata);
        room = id;
        version = joined.state.version;
        return joined.state.state;
      }),
    leaveRoom: () =>
      serial(async () => {
        if (!room) return;
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
      const poll = async () => {
        try {
          if (
            stopped ||
            room !== subscribedRoom ||
            roomEpoch !== subscribedEpoch
          )
            return;
          const state = await multiplayer.getRoomState();
          if (
            stopped ||
            room !== subscribedRoom ||
            roomEpoch !== subscribedEpoch
          )
            return;
          onState(state);
          timer = setTimeout(poll, Math.max(1000, intervalMs));
        } catch (error) {
          if (!stopped) {
            stopped = true;
            onError(error);
          }
        }
      };
      void poll();
      return () => {
        stopped = true;
        if (timer) clearTimeout(timer);
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
