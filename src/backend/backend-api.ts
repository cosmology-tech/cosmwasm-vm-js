export interface IBackendApi {
  canonical_address(human: string): Uint8Array;

  human_address(canonical: Uint8Array): string;
}

export class IBackendApi {

  constructor(public bech32_prefix: string = 'terra') {

  }

  public canonical_address(human: string): Uint8Array {
    throw new Error('Method not implemented.');
  }

  public human_address(canonical: Uint8Array): string {
    throw new Error('Method not implemented.');
  }
}
