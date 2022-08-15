export interface IQuerier {
  query_raw(request: Uint8Array, gas_limit: number /* Uint64 */): Uint8Array;
}

export class BasicQuerier implements IQuerier {
  constructor() {
    this.query_raw = this.query_raw.bind(this);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  query_raw(request: Uint8Array, gas_limit: number): Uint8Array {
    return request;
  }
}
