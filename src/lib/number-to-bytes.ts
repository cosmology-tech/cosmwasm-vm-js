import { fromHex } from '@cosmjs/encoding';

export default function numberToBytes(number: number): Uint8Array {
  let hex = number.toString(16);
  if (hex.length % 2 === 1) {
    hex = `0${hex}`;
  }

  return fromHex(hex);
}
