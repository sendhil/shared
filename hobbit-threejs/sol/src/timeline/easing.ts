export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function smoothstep(value: number): number {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}

export function smootherstep(value: number): number {
  const progress = clamp01(value);
  return (
    progress *
    progress *
    progress *
    (progress * (progress * 6 - 15) + 10)
  );
}

export function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

export function windowedProgress(
  time: number,
  start: number,
  end: number,
): number {
  if (start === end) {
    return time < start ? 0 : 1;
  }

  return clamp01((time - start) / (end - start));
}
