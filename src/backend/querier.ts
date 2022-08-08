export interface IQuerier {
  query_raw(request: Uint8Array, gas_limit: number /* Uint64 */): Uint8Array;
}
