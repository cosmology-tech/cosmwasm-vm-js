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

const wasm_byte_code = readFileSync('testdata/hackatom.wasm');
const backend: IBackend = {
  backend_api: new BasicBackendApi('terra'),
  storage: new BasicKVIterStorage(),
  querier: new BasicQuerier(),
};

const vm = new VMInstance(backend);
const mock_env = {
  block: {
    height: 1337,
    time: '2000000000',
    chain_id: 'columbus-5',
  },
  contract: {
    address: 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76',
  },
};

const mock_info = {
  sender: 'terra1337xewwfv3jdjuz8e0nea9vd8dpugc0k2dcyt3',
  funds: [],
};

describe('integration', () => {
  it('proper_initialization', async () => {
    // Arrange
    await vm.build(wasm_byte_code);

    // Act
    const region = vm.instantiate(mock_env, mock_info, {
      verifier: 'terra1kzsrgcktshvqe9p089lqlkadscqwkezy79t8y9',
      beneficiary: 'terra1zdpgj8am5nqqvht927k3etljyl6a52kwqup0je'
    });

    // Assert
    expect(region.json).toEqual({
      ok: {
        attributes: [
          { key: 'Let the', value: 'hacking begin' },
        ],
        data: null,
        events: [],
        messages: [],
      },
    });
  });

  it('instantiate_and_query', async () => {
    // Arrange
    await vm.build(wasm_byte_code);
    vm.instantiate(mock_env, mock_info, {
      verifier: 'terra1kzsrgcktshvqe9p089lqlkadscqwkezy79t8y9',
      beneficiary: 'terra1zdpgj8am5nqqvht927k3etljyl6a52kwqup0je'
    });

    // Act
    const response = vm.query(mock_env, { verifier: {} });
    const verifier = parseResponse(response);

    // Assert
    expect(verifier).toEqual({ verifier: 'terra1kzsrgcktshvqe9p089lqlkadscqwkezy79t8y9' });
  });

  it('migrate_verifier', async () => {});
  it('sudo_can_steal_tokens', async () => {});
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
  it('passes_io_tests', async () => {});
});

// Helpers

function parseResponse(region: Region): any {
  const data = (region.json as { ok: string }).ok;
  return JSON.parse(fromAscii(fromBase64(data)));
}
