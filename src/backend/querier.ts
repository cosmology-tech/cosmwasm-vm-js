export interface IQuerier {
  query_raw(request: Uint8Array, gas_limit: number /* Uint64 */): Uint8Array;
}

export class BasicQuerier implements IQuerier {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  query_raw(request: Uint8Array, gas_limit: number): Uint8Array {
    const queryRequest = parseQuery(request);

    // TODO: make room for error
    // The Ok(Ok(x)) represents SystemResult<ContractResult<Binary>>

    return objectToUint8Array({ ok: { ok: objectToBase64(this.handleQuery(queryRequest)) }});
  }

  handleQuery(queryRequest: any): any {
    throw new Error(`Unimplemented - subclass BasicQuerier and provide handleQuery() implementation.`)
  }
}


function parseQuery(bytes: Uint8Array): any {
  const query = JSON.parse(new TextDecoder().decode(bytes));
  return query;
}

function objectToBase64(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

function objectToUint8Array(obj: object): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj));
}
