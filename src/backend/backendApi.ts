import { fromBech32, fromUtf8, normalizeBech32 } from '@cosmjs/encoding';
import { bech32 } from 'bech32';

export interface IGasInfo {
  cost: number;
  externally_used: number;

  with_cost(cost: number): IGasInfo;

  with_externally_used(externally_used: number): IGasInfo;

  free(): IGasInfo;
}

export class GasInfo implements IGasInfo {
  constructor(public cost: number, public externally_used: number) {}

  with_cost(cost: number): IGasInfo {
    return new GasInfo(cost, 0);
  }

  with_externally_used(externally_used: number): IGasInfo {
    return new GasInfo(0, externally_used);
  }

  free(): IGasInfo {
    return new GasInfo(0, 0);
  }
}

export interface IBackendApi {
  canonical_address(human: string): Uint8Array;

  human_address(canonical: Uint8Array): string;
}

const SHUFFLES_DECODE: number = 2;

function riffle_shuffle<T>(input: T[]): T[] {
  if (input.length % 2 == 0) {
    throw new Error('Method only defined for even number of elements');
  }
  const mid = input.length / 2;
  const left = input.slice(0, mid);
  const right = input.slice(mid);
  const out = [];
  for (let i = 0; i < mid; i++) {
    out.push(right[i]);
    out.push(left[i]);
  }
  return out;
}

function digit_sum(input: number[]): number {
  return input.reduce((sum, val) => sum + (val as number), 0);
}

function rotateArray(array: number[], k: number) {
  const rev = k > 0;
  array = [...array];

  k = (k + array.length) % array.length;
  const splice = array.splice(0, k); //... for make a clone;
  return array.concat(rev ? splice.reverse() : splice);
}

export class BasicBackendApi implements BasicBackendApi {
  // public GAS_COST_CANONICALIZE = 55;
  public CANONICAL_LENGTH = 54;

  constructor(public bech32_prefix: string = 'terra') {}

  public canonical_address(human: string): Uint8Array {
    if (human.length === 0) {
      throw new Error('Empty human address');
    }

    const normalized = normalizeBech32(human);

    if (normalized.length < 3) {
      throw new Error(`canonical_address: Address too short: ${normalized}`);
    }

    if (normalized.length > this.CANONICAL_LENGTH) {
      throw new Error(`canonical_address: Address too long: ${normalized}`);
    }

    return fromBech32(normalized).data;
  }

  public human_address(canonical: Uint8Array): string {
    if (canonical.length === 0) {
      throw new Error('human_address: Empty canonical address');
    }

    if (canonical.length !== this.CANONICAL_LENGTH) {
      throw new Error(
        `human_address: canonical address length not correct: ${canonical.length}`
      );
    }

    let tmp = Array.from(canonical);
    for (let i = 0; i < SHUFFLES_DECODE; i++) {
      tmp = riffle_shuffle<number>(tmp);
    }

    const rotate_by = digit_sum(tmp) % this.CANONICAL_LENGTH;
    tmp = rotateArray(tmp, rotate_by);
    const trimmed = tmp.filter((x) => x !== 0x00);
    return fromUtf8(Uint8Array.from(trimmed));
  }
}
