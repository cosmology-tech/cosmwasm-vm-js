export interface IQuerier {
  query_raw(request: Uint8Array, gas_limit: number /* Uint64 */): Uint8Array;
}

export class BasicQuerier implements IQuerier {
  constructor() {}

  query_raw(request: Uint8Array, gas_limit: number): Uint8Array {
    return request;
  }
}
