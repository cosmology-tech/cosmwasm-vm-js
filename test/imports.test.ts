/* Constants from https://github.com/cosmwasm/cosmwasm/blob/5e04c3c1aa7e278626196de43aa18e9bedbc6000/packages/vm/src/imports.rs#L499 */
import { readFileSync } from 'fs';
import {
  BasicBackendApi,
  BasicKVStorage,
  BasicQuerier,
  IBackend,
} from '../src/backend';
import { Region, VMInstance } from '../src';
import { fromHex, toAscii, toUtf8 } from '@cosmjs/encoding';

const KEY1 = toAscii('ant');
const VALUE1 = toAscii('insect');
const KEY2 = toAscii('tree');
const VALUE2 = toAscii('plant');

const INIT_ADDR = 'someone';
const INIT_AMOUNT = 500;
const INIT_DENOM = 'TOKEN';

const ECDSA_HASH_HEX =
  '5ae8317d34d1e595e3fa7247db80c0af4320cce1116de187f8f7e2e099c0d8d0';

const ECDSA_SIG_HEX =
  '207082eb2c3dfa0b454e0906051270ba4074ac93760ba9e7110cd9471475111151eb0dbbc9920e72146fb564f99d039802bf6ef2561446eb126ef364d21ee9c4';
const ECDSA_PUBKEY_HEX =
  '04051c1ee2190ecfb174bfe4f90763f2b4ff7517b70a2aec1876ebcfd644c4633fb03f3cfbd94b1f376e34592d9d41ccaf640bb751b00a1fadeb0c01157769eb73';

const EDDSA_MSG_HEX = '';
const EDDSA_SIG_HEX =
  'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b';

const hexToBytes = (hex: string): Uint8Array => {
  return Uint8Array.from(Buffer.from(hex, 'hex'));
};

const createVM = (): VMInstance => {
  const wasm_byte_code = readFileSync('testdata/hackatom.wasm');
  const backend: IBackend = {
    backend_api: new BasicBackendApi('terra'),
    storage: new BasicKVStorage(),
    querier: new BasicQuerier(),
  };

  let vm = new VMInstance(wasm_byte_code, backend);
  vm.backend.storage.set(KEY1, VALUE1);
  vm.backend.storage.set(KEY2, VALUE2);
  return vm;
};

const writeData = (vm: VMInstance, data: Uint8Array): Region => {
  return vm.allocate_bytes(data);
};

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

const MSG = {
  verifier: 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76',
  beneficiary: 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76',
  block: {
    height: 1337,
    time: '2000000000',
    chain_id: 'columbus-5',
  },
  contract: {
    address: 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76',
  },
};

describe('do_db_read', () => {
  it('works', () => {
    const vm = createVM();
    let key_ptr = writeData(vm, KEY1);
    let result = vm.do_db_read(key_ptr);

    expect(result.ptr).toBeGreaterThan(0);
    expect(result.data).toEqual(VALUE1);
  });

  it('works for non-existent key', () => {
    const vm = createVM();
    let key_ptr = writeData(vm, toAscii('I do not exist in storage'));
    let result = vm.do_db_read(key_ptr);

    expect(result.ptr).toEqual(0);
  });

  // TODO: fails for large key
});

describe('do_db_write', () => {
  it('works', () => {
    const vm = createVM();

    let key_ptr = writeData(vm, toAscii('new storage key'));
    let value_ptr = writeData(vm, toAscii('new value'));

    vm.do_db_write(key_ptr, value_ptr);
    let val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii('new value'));
  });

  it('can override', () => {
    const vm = createVM();

    let key_ptr = writeData(vm, KEY1);
    let value_ptr = writeData(vm, VALUE2);

    vm.do_db_write(key_ptr, value_ptr);
    let val = vm.backend.storage.get(KEY1);
    expect(val).toEqual(VALUE2);
  });
  it('works for empty value', () => {
    const vm = createVM();

    let key_ptr = writeData(vm, toAscii('new storage key'));
    let value_ptr = writeData(vm, toAscii(''));
    vm.do_db_write(key_ptr, value_ptr);

    let val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii(''));
  });

  // TODO: fails for large key
  // TODO: fails for large value
  // TODO: is prohibited in readonly contexts
});

describe('do_db_remove', () => {
  it('works', () => {});
  it('is prohibited in readonly contexts', () => {});
});

describe('do_addr_validate', () => {
  it('works', () => {});
});

describe('do_addr_canonicalize', () => {
  it('works', () => {});
});

describe('do_addr_humanize', () => {
  it('works', () => {});
});

describe('do_secp256k1_verify', () => {
  it('works', () => {});
});

describe('do_secp256k1_recover_pubkey', () => {
  it('works', () => {});
});

describe('do_ecdsa_verify', () => {
  it('works', () => {});
});

describe('do_query_chain', () => {});

describe('do_db_scan', () => {
  it('unbound works', () => {});
  it('unbound descending works', () => {});
  it('bound works', () => {});
  it('bound descending works', () => {});
  it('multiple iterators', () => {});
});

describe('do_db_query', () => {});

describe('do_db_next', () => {
  it('works', () => {});
});
