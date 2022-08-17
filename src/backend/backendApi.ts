import { fromBech32, normalizeBech32 } from '@cosmjs/encoding';
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

export class BasicBackendApi implements BasicBackendApi {
  // public GAS_COST_CANONICALIZE = 55;
  public CANONICAL_LENGTH = 54;
  public EXCESS_PADDING = 6;
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

    // Remove excess padding, otherwise bech32.encode will throw "Exceeds length limit" error.
    const normalized =
      canonical.length - this.EXCESS_PADDING >= 48
        ? canonical.slice(0, this.CANONICAL_LENGTH - this.EXCESS_PADDING)
        : canonical;
    return bech32.encode(this.bech32_prefix, bech32.toWords(normalized));
  }
}
