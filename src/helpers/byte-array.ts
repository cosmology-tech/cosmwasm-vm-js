import { toHex, fromHex } from '@cosmjs/encoding';

/**
 * Compares two byte arrays using the same logic as strcmp()
 *
 * @returns {number} bytes1 < bytes2 --> -1; bytes1 == bytes2 --> 0; bytes1 > bytes2 --> 1
 */
 export function compare(
  bytes1: Uint8Array,
  bytes2: Uint8Array
): number {
  const length = Math.max(bytes1.length, bytes2.length);
  for (let i = 0; i < length; i++) {
    if (bytes1.length < i) return -1;
    if (bytes2.length < i) return 1;

    if (bytes1[i] < bytes2[i]) return -1;
    if (bytes1[i] > bytes2[i]) return 1;
  }

  return 0;
}


export function toNumber(byteArray: Uint8Array) {
  return parseInt(toHex(byteArray));
}

export function toByteArray(number: number): Uint8Array {
  let hex = number.toString(16);
  if (hex.length % 2 === 1) {
    hex = `0${hex}`;
  }

  return fromHex(hex);
}
