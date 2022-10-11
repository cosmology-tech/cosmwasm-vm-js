export interface IQuerier {
  query_raw(request: Uint8Array, gas_limit: number /* Uint64 */): Uint8Array;
  update_balance(addr: string, balance: { amount: string, denom: string }[]): { amount: string, denom: string }[];
}

export class BasicQuerier implements IQuerier {
  private balances: Map<string, { amount: string, denom: string }[]> = new Map();

  constructor() {
    this.query_raw = this.query_raw.bind(this);
  }

  update_balance(addr: string, balance: { amount: string; denom: string; }[]): { amount: string; denom: string; }[] {
    this.balances.set(addr, balance);
    return balance;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  query_raw(request: Uint8Array, gas_limit: number): Uint8Array {
    const [query, type] = parseQuery(request);

    switch (type) {
      case QueryType.AllBalances:
        const address = query.bank.all_balances.address as string;
        const balances = { amount: this.balances.get(address) || [] };
        return objectToUint8Array({ok: {ok: objectToBase64(balances)}});

      default:
        throw new Error('Not implemented');
    }

    // ToDo: gas
  }
}

enum QueryType { AllBalances }

function parseQuery(bytes: Uint8Array): [any, QueryType] {
  const query = JSON.parse(new TextDecoder().decode(bytes));
  return [query, queryType(query)];
}

function queryType(query: any): QueryType {
  if (query.bank?.all_balances) {
    return QueryType.AllBalances;
  }

  throw new Error('Not implemented');
}

function objectToBase64(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

function objectToUint8Array(obj: object): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj));
}
