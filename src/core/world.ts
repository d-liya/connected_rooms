// All world positions and sizes use 0..1000. Anchors use fractions 0..1.
export interface Point { x: number; y: number }
export interface Room {
  id: string; label: string; groundY: number;
  bounds: { left: number; right: number }; spawn: Point;
}
export interface Connection {
  id: string; from: string; to: string; x: number; targetX: number; label: string;
}
export interface WorldDefinition {
  aspectRatio: number; image: string; startRoom: string;
  rooms: Room[]; connections: Connection[];
}
export function validateWorld(world: WorldDefinition): void {
  const ids = new Set(world.rooms.map(room => room.id));
  const valid = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1000;
  if (!(world.aspectRatio > 0) || !Number.isFinite(world.aspectRatio)) throw new Error("Invalid map ratio");
  if (ids.size !== world.rooms.length || !ids.has(world.startRoom)) throw new Error("Invalid room IDs/start room");
  for (const room of world.rooms) {
    if (![room.groundY, room.bounds.left, room.bounds.right, room.spawn.x, room.spawn.y].every(valid)
      || room.bounds.left >= room.bounds.right || room.spawn.x < room.bounds.left || room.spawn.x > room.bounds.right)
      throw new Error(`Invalid room geometry: ${room.id}`);
  }
  const connections = new Set<string>();
  for (const edge of world.connections) {
    const from = world.rooms.find(room => room.id === edge.from);
    const to = world.rooms.find(room => room.id === edge.to);
    if (connections.has(edge.id) || !from || !to || !valid(edge.x) || !valid(edge.targetX)
      || edge.x < from.bounds.left || edge.x > from.bounds.right
      || edge.targetX < to.bounds.left || edge.targetX > to.bounds.right) throw new Error(`Invalid connection: ${edge.id}`);
    connections.add(edge.id);
  }
}
