import { readFileSync } from 'fs';
import { BasicKVIterStorage, VMInstance } from '../src';
import { BasicBackendApi, BasicQuerier, IBackend } from '../src/backend';
import { writeData } from './common/test-vm';
import * as testData from './common/test-data';

const wasmByteCode = readFileSync('testdata/v1.0/cosmwasm_vm_test.wasm');
const cwMachineBytecode = readFileSync('testdata/v1.0/cw_machine-aarch64.wasm');
const backend: IBackend = {
  backend_api: new BasicBackendApi('terra'),
  storage: new BasicKVIterStorage(),
  querier: new BasicQuerier(),
};

const vm = new VMInstance(backend);
const mockEnv = {
  block: {
    height: 1337,
    time: '2000000000',
    chain_id: 'columbus-5',
  },
  contract: {
    address: 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76',
  },
};

const mockInfo = {
  sender: 'terra1337xewwfv3jdjuz8e0nea9vd8dpugc0k2dcyt3',
  funds: [],
};

describe('CosmWasmVM', () => {
  it('instantiates', async () => {
    await vm.build(wasmByteCode);

    const region = vm.instantiate(mockEnv, mockInfo, { count: 20 });
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
    await vm.build(wasmByteCode);

    let region = vm.instantiate(mockEnv, mockInfo, { count: 20 });
    region = vm.execute(mockEnv, mockInfo, { increment: {} });
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

  it('reply', async () => {
    await vm.build(cwMachineBytecode);

    let region = vm.instantiate(mockEnv, mockInfo, {});
    region = vm.reply(mockEnv, {
      id: 1,
      result: {
        ok: {
          events: [{ type: 'wasm', attributes: [{ key: 'k', value: 'v' }] }],
          data: null,
        },
      },
    });
    expect('ok' in region.json).toBeTruthy();

    region = vm.reply(mockEnv, {
      id: 2,
      result: {
        ok: {
          events: [{ type: 'wasm', attributes: [{ key: 'k', value: 'v' }] }],
          data: null,
        },
      },
    });
    expect('error' in region.json).toBeTruthy();
  });

  it('serializes', async () => {
    // Arrange
    await vm.build(wasmByteCode);
    vm.instantiate(mockEnv, mockInfo, { count: 20 });

    // Act
    const json = JSON.stringify(vm);

    // Assert
    expect(json).toBeDefined();
  });

  it('serializes after edda usage', async () => {
    // Arrange
    await vm.build(wasmByteCode);
    vm.instantiate(mockEnv, mockInfo, { count: 20 });

    const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX);
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX);
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX);
    vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);

    // Act
    const json = JSON.stringify(vm);

    // Assert
    expect(json).toBeDefined();
  });
});
