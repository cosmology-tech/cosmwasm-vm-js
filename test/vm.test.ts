import { readFileSync } from 'fs';
import { BasicKVStorage, VMInstance } from '../src';
import { BasicBackendApi, BasicQuerier, IBackend } from '../src/backend';

const wasm_byte_code = readFileSync('testdata/cosmwasm_vm_test.wasm');
const backend: IBackend = {
  backend_api: new BasicBackendApi('terra'),
  storage: new BasicKVStorage(),
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

describe('CosmWasmVM', () => {
  it('instantiates', async () => {
    await vm.build(wasm_byte_code);

    const region = vm.instantiate(mock_env, mock_info, { count: 20 });
    console.log(region.json);
    console.log(vm.backend);
    const actual = {
      ok: {
        attributes: [
          { key: 'method', value: 'instantiate' },
          {
            key: 'owner',
            value: 'terra1337xewwfv3jdjuz8e0nea9vd8dpugc0k2dcyt3',
          },
          { key: 'count', value: '20' },
        ],
        data: null,
        events: [],
        messages: [],
      },
    };
    expect(region.json).toEqual(actual);
  });

  it('execute', async () => {
    await vm.build(wasm_byte_code);

    let region = vm.instantiate(mock_env, mock_info, { count: 20 });
    region = vm.execute(mock_env, mock_info, { increment: {} });
    console.log(region.json);
    console.log(vm.backend);
    const actual = {
      ok: {
        attributes: [{ key: 'method', value: 'try_increment' }],
        data: null,
        events: [],
        messages: [],
      },
    };
    expect(region.json).toEqual(actual);
  });
});
