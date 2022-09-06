import { readFileSync } from 'fs';
import { VMInstance } from "../src/instance";
import {
  BasicBackendApi,
  BasicKVIterStorage,
  BasicQuerier,
  IBackend,
} from '../src/backend';
import { fromAscii, fromBase64 } from '@cosmjs/encoding';
import { Region } from '../src/memory';

const wasmBytecode = readFileSync('testdata/hackatom.wasm');
const backend: IBackend = {
  backend_api: new BasicBackendApi('terra'),
  storage: new BasicKVIterStorage(),
  querier: new BasicQuerier(),
};

const verifier = 'terra1kzsrgcktshvqe9p089lqlkadscqwkezy79t8y9';
const beneficiary = 'terra1zdpgj8am5nqqvht927k3etljyl6a52kwqup0je';
const address = 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76';
const sender = 'terra1337xewwfv3jdjuz8e0nea9vd8dpugc0k2dcyt3';

const mockEnv = {
  block: {
    height: 1337,
    time: '2000000000',
    chain_id: 'columbus-5',
  },
  contract: { address }
};

const mockInfo = { sender, funds: [] as { amount: number, denom: string }[] };

let vm: VMInstance;
describe('integration', () => {
  beforeEach(async () => {
    vm = new VMInstance(backend);
    await vm.build(wasmBytecode);
  });

  it('proper_initialization', async () => {
    // Act
    const instantiateResponse = vm.instantiate(mockEnv, mockInfo, {
      verifier: 'terra1kzsrgcktshvqe9p089lqlkadscqwkezy79t8y9',
      beneficiary: 'terra1zdpgj8am5nqqvht927k3etljyl6a52kwqup0je'
    });

    // Assert
    expect(instantiateResponse.json).toEqual({
      ok: {
        attributes: [
          { key: 'Let the', value: 'hacking begin' },
        ],
        data: null,
        events: [],
        messages: [],
      },
    });
    expectVerifierToBe('terra1kzsrgcktshvqe9p089lqlkadscqwkezy79t8y9');
  });

  it('instantiate_and_query', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Act
    const queryResponse = vm.query(mockEnv, { verifier: {} });

    // Assert
    expectResponseToBeOk(queryResponse);
    expect(parseBase64Response(queryResponse)).toEqual({ verifier: 'terra1kzsrgcktshvqe9p089lqlkadscqwkezy79t8y9' });
  });

  it('migrate_verifier', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Act
    let response = vm.migrate(mockEnv, { verifier: 'terra1h8ljdmae7lx05kjj79c9ekscwsyjd3yr8wyvdn' });

    // Assert
    expectResponseToBeOk(response);
    expect((response.json as { ok: { messages: any[] }}).ok.messages.length).toBe(0);
    expectVerifierToBe('terra1h8ljdmae7lx05kjj79c9ekscwsyjd3yr8wyvdn');
  });

  it.skip('sudo_can_steal_tokens', async () => {
    throw new Error('Not implemented');
  });

  it('querier_callbacks_work', async () => {});

  it('fails_on_bad_init', async () => {});

  it('execute_release_works', async () => {});

  it('execute_release_fails_for_wrong_sender', async () => {});

  it('execute_argon2', async () => {});

  it('execute_cpu_loop', async () => {});

  it('execute_storage_loop', async () => {});

  it('execute_memory_loop', async () => {});

  it('execute_allocate_large_memory', async () => {});

  it('execute_panic', async () => {});

  it('execute_user_errors_in_api_calls', async () => {});

  it.skip('passes_io_tests', async () => {
    throw new Error('Not implemented');
  });
});

// Helpers

function expectResponseToBeOk(region: Region) {
  try {
    expect((region.json as { ok: string }).ok).toBeDefined();
  } catch (_) {
    throw new Error(`Expected response to be ok; instead got: ${JSON.stringify(region.json)}`);
  }
}

function expectVerifierToBe(addr: string) {
  const queryResponse = vm.query(mockEnv, { verifier: {} });
  const verifier = parseBase64Response(queryResponse);
  expect(verifier).toEqual({ verifier: addr });
}

function parseBase64Response(region: Region): any {
  const data = (region.json as { ok: string }).ok;
  if (!data) {
    throw new Error(`Response indicates an error state: ${JSON.stringify(region.json)}`)
  }

  let bytes: Uint8Array;
  try {
    bytes = fromBase64(data);
  } catch (_) {
    throw new Error(`Data value is not base64-encoded: ${JSON.stringify(data)}`)
  }

  let str: string;
  try {
    str = fromAscii(bytes);
  } catch (_) {
    throw new Error(`Data value is not ASCII encoded: ${JSON.stringify(bytes)}`)
  }

  try {
    return JSON.parse(str);
  } catch (_) {
    throw new Error(`Data value is not valid JSON: ${str}`)
  }
}
