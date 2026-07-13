export function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function easeInOutCubic(value: number) {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

export function easeOutCubic(value: number) {
  return 1 - (1 - clamp01(value)) ** 3;
}

export function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}
