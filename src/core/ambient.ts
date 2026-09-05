// Run for every living actor during gameplay, including other rooms. Keep combat local.
export function advancePatrol(x: number, facing: "left" | "right", left: number, right: number, speed: number, dt: number) {
  if (!(right > left)) return { x: left, facing };
  const width = right - left;
  const phase = (facing === "right" ? x - left : 2 * width - (x - left)) + speed * dt;
  const t = ((phase % (2 * width)) + 2 * width) % (2 * width);
  return { x: left + (t <= width ? t : 2 * width - t), facing: (t < width ? "right" : "left") as "left" | "right" };
}
