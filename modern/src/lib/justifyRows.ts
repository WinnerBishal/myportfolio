export type JustifyOptions = {
  /** Reference width the packer solves against; rows stay proportional at any real width. */
  containerWidth?: number;
  /** Preferred row height at the reference width. */
  targetHeight?: number;
  /** Gap between tiles, in the same units as containerWidth. */
  gap?: number;
  /** Hard cap on tiles per row so wide thumbnails never shrink to slivers. */
  maxPerRow?: number;
  /** Trailing-row slack below which the row just fills the width instead of leaving a gap. */
  fillerThreshold?: number;
};

export type JustifiedRow<T> = {
  items: T[];
  /** Leftover flex-grow for an unfilled trailing row; 0 when the row fills the width. */
  filler: number;
};

/**
 * Greedy justified-gallery packing: tiles keep their aspect ratio and each row
 * spans the full width, so every tile in a row resolves to the same height.
 * Rendering assigns `flex-grow: aspect` with `flex-basis: 0`, which reproduces
 * these proportions at any viewport width without measuring in the browser.
 *
 * A row closes once it is at least as full as `targetHeight` asks for, except
 * when dropping the last tile lands closer to the target — that keeps a wide
 * thumbnail from squashing a whole row.
 */
export function justifyRows<T>(
  items: T[],
  aspectOf: (item: T) => number,
  options: JustifyOptions = {}
): JustifiedRow<T>[] {
  const {
    containerWidth = 1120,
    targetHeight = 250,
    gap = 8,
    maxPerRow = 4,
    fillerThreshold = 0.06
  } = options;

  const rows: JustifiedRow<T>[] = [];
  let current: T[] = [];
  let aspectSum = 0;

  const rowHeight = (count: number, sum: number) => (containerWidth - gap * (count - 1)) / sum;
  const closeRow = () => {
    rows.push({ items: current, filler: 0 });
    current = [];
    aspectSum = 0;
  };

  for (const item of items) {
    const aspect = aspectOf(item);
    const heightWith = rowHeight(current.length + 1, aspectSum + aspect);

    if (current.length > 0 && heightWith < targetHeight) {
      const heightWithout = rowHeight(current.length, aspectSum);
      if (Math.abs(heightWithout - targetHeight) <= Math.abs(heightWith - targetHeight)) {
        closeRow();
      }
    }

    current.push(item);
    aspectSum += aspect;

    if (rowHeight(current.length, aspectSum) <= targetHeight || current.length >= maxPerRow) {
      closeRow();
    }
  }

  if (current.length > 0) {
    // Hold the trailing row at the target height instead of stretching a lone
    // tile across the full width; the filler absorbs the remaining track.
    const usable = containerWidth - gap * current.length;
    const filler = Math.max(0, usable / targetHeight - aspectSum);
    rows.push({ items: current, filler: filler > fillerThreshold ? filler : 0 });
  }

  return rows;
}
