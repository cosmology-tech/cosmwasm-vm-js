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

export function toNumber(bigEndianByteArray: Uint8Array | number[]) {
  let value = 0;
  for (let i = 0; i < bigEndianByteArray.length; i++) {
      value = (value * 256) + bigEndianByteArray[i];
  }
  return value;
}

export function toByteArray(number: number, fixedLength?: number | undefined): Uint8Array {
  let hex = number.toString(16);
  if (hex.length % 2 === 1) {
    hex = `0${hex}`;
  }

  const bytesOriginal = fromHex(hex);

  if (!fixedLength) {
    return bytesOriginal;
  }

  let bytesFixedLength = [...bytesOriginal];
  for (let i = 0; i < fixedLength - bytesOriginal.length; i++) {
    bytesFixedLength = [0, ...bytesFixedLength];
  }

  return new Uint8Array(bytesFixedLength);
}
