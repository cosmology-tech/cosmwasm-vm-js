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
const creator = 'terra1337xewwfv3jdjuz8e0nea9vd8dpugc0k2dcyt3';

const mockEnv = {
  block: {
    height: 1337,
    time: '2000000000',
    chain_id: 'columbus-5',
  },
  contract: { address: 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76' }
};

const mockInfo: { sender: string, funds: { amount: string, denom: string }[] } = {
  sender: creator,
  funds: []
};

let vm: VMInstance;
describe('integration', () => {
  beforeEach(async () => {
    vm = new VMInstance(backend);
    await vm.build(wasmBytecode);
  });

  it('proper_initialization', async () => {
    // Act
    const instantiateResponse = vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

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
    expectVerifierToBe(verifier);
  });

  it('instantiate_and_query', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Act
    const queryResponse = vm.query(mockEnv, { verifier: {} });

    // Assert
    expectResponseToBeOk(queryResponse);
    expect(parseBase64Response(queryResponse)).toEqual({ verifier });
  });

  it('migrate_verifier', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Act
    const newVerifier = 'terra1h8ljdmae7lx05kjj79c9ekscwsyjd3yr8wyvdn'
    let response = vm.migrate(mockEnv, { verifier: newVerifier });

    // Assert
    expectResponseToBeOk(response);
    expect((response.json as { ok: { messages: any[] }}).ok.messages.length).toBe(0);
    expectVerifierToBe(newVerifier);
  });

  it.skip('sudo_can_steal_tokens', async () => {}); // sudo not implemented

  it.skip('querier_callbacks_work', async () => { // query_chain not implemented
    // Arrange
    vm.instantiate(
      mockEnv,
      { sender: creator, funds: [{ amount: '10000', denom: 'gold' }] },
      { verifier, beneficiary });

    // Act
    const queryResponse = vm.query(mockEnv, { other_balance: { address: creator } });

    // Assert
    expectResponseToBeOk(queryResponse);
    // ToDo: moar assert
  });

  it('fails_on_bad_init', async () => {
    // Act
    const response = vm.instantiate(
      mockEnv,
      { funds: [{ amount: '1000', denom: 'earth' }] }, // invalid info message, missing sender field
      { verifier, beneficiary });

    // Assert
    expect((response.json as { error: string }).error.indexOf('Error parsing')).toBe(0);
  });

  it.skip('execute_release_works', async () => { // query_chain not implemented
    // Arrange
    vm.instantiate(
      mockEnv,
      { sender: creator, funds: [{ amount: '1000', denom: 'earth' }] },
      { verifier, beneficiary });

    // Act
    const execResponse = vm.execute(
      mockEnv,
      { sender: verifier, funds: [] },
      { release: {}});

    // Assert
    expectResponseToBeOk(execResponse);
    // ToDo: moar assert
  });

  it.skip('execute_release_fails_for_wrong_sender', async () => {}); // query_chain not implemented

  it('execute_panic', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Act
    expect(() => vm.execute(mockEnv, mockInfo, { panic: {} })).toThrow();
  });

  it('execute_user_errors_in_api_calls', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Act
    expect(() => vm.execute(mockEnv, mockInfo, { user_errors_in_api_calls: {} })).toThrow();
  });

  it.skip('passes_io_tests', async () => {
    // Reference implementation: https://github.com/CosmWasm/cosmwasm/blob/a9ae6fa76ba6c05de1792f887a09401856f14bc1/packages/vm/src/testing/instance.rs#L171
    // pub fn test_io<A, S, Q>(instance: &mut Instance<A, S, Q>)
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
