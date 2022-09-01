import { toHex } from '@cosmjs/encoding';

export default function bytesToNumber(byteArray: Uint8Array) {
  return parseInt(toHex(byteArray));
}
