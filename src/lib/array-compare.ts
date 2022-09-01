export default function array_compare(start: Uint8Array, end: Uint8Array) : number {
  const length = Math.max(start.length, end.length);
  for (let i = 0; i < length; i++) {
    if (start.length < i) return -1;
    if (end.length < i) return 1;

    if (start[i] < end[i]) return -1;
    if (start[i] > end[i]) return 1;
  }

  return 0;
}
