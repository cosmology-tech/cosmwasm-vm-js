/* Constants from https://github.com/cosmwasm/cosmwasm/blob/5e04c3c1aa7e278626196de43aa18e9bedbc6000/packages/vm/src/imports.rs#L499 */
import { readFileSync } from 'fs';
import {
  BasicBackendApi,
  BasicKVStorage,
  BasicQuerier,
  IBackend,
} from '../src/backend';
import { Region, VMInstance } from '../src';
import { toAscii } from '@cosmjs/encoding';

// In Rust, b"XXX" is the same as creating a bytestring of the ASCII-encoded string "XXX".
const KEY1 = toAscii('ant');
const VALUE1 = toAscii('insect');
const KEY2 = toAscii('tree');
const VALUE2 = toAscii('plant');

const createVM = async (): Promise<VMInstance> => {
  const wasm_byte_code = readFileSync('testdata/hackatom.wasm');
  const backend: IBackend = {
    backend_api: new BasicBackendApi('terra'),
    storage: new BasicKVStorage(),
    querier: new BasicQuerier(),
  };

  const vm = new VMInstance(backend);
  vm.backend.storage.set(KEY1, VALUE1);
  vm.backend.storage.set(KEY2, VALUE2);

  await vm.build(wasm_byte_code);
  return vm;
};

const writeData = (vm: VMInstance, data: Uint8Array): Region => {
  return vm.allocate_bytes(data);
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
  it('works', async () => {
    const vm = await createVM();
    const key_ptr = writeData(vm, KEY1);
    const result = vm.do_db_read(key_ptr);

    expect(result.ptr).toBeGreaterThan(0);
    expect(result.data).toEqual(VALUE1);
  });

  it('works for non-existent key', async () => {
    const vm = await createVM();
    const key_ptr = writeData(vm, toAscii('I do not exist in storage'));
    const result = vm.do_db_read(key_ptr);

    expect(result.ptr).toEqual(0);
  });

  // TODO: fails for large key
});

describe('do_db_write', () => {
  it('works', async () => {
    const vm = await createVM();

    const key_ptr = writeData(vm, toAscii('new storage key'));
    const value_ptr = writeData(vm, toAscii('new value'));

    vm.do_db_write(key_ptr, value_ptr);
    const val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii('new value'));
  });

  it('can override', async () => {
    const vm = await createVM();

    const key_ptr = writeData(vm, KEY1);
    const value_ptr = writeData(vm, VALUE2);

    vm.do_db_write(key_ptr, value_ptr);
    const val = vm.backend.storage.get(KEY1);
    expect(val).toEqual(VALUE2);
  });
  it('works for empty value', async () => {
    const vm = await createVM();

    const key_ptr = writeData(vm, toAscii('new storage key'));
    const value_ptr = writeData(vm, toAscii(''));
    vm.do_db_write(key_ptr, value_ptr);

    const val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii(''));
  });

  it('fails for large key', async () => {
    try {
      const vm = await createVM();
      const key_ptr = writeData(vm, toAscii('new storage key'));
      const value_ptr = writeData(vm, toAscii('x'.repeat(1025)));
      vm.do_db_write(key_ptr, value_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error('db_write: value too large: ' + 'x'.repeat(1025))
      );
    }
  });

  it('fails for large value', async () => {
    try {
      const vm = await createVM();
      const key_ptr = writeData(vm, toAscii('new storage key'.repeat(1025)));
      const value_ptr = writeData(vm, toAscii(''));
      vm.do_db_write(key_ptr, value_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error('db_write: key too large: ' + 'new storage key'.repeat(1025))
      );
    }
  });

  // TODO: is prohibited in readonly contexts
});

describe('do_db_remove', () => {
  it('works', async () => {
    const vm = await createVM();
    const key_ptr = writeData(vm, toAscii('new storage key'));
    const value_ptr = writeData(vm, toAscii('x'));
    vm.do_db_write(key_ptr, value_ptr);

    let val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii('x'));

    vm.backend.storage.remove(toAscii('new storage key'));
    val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(null);
  });

  it('is prohibited in readonly contexts', () => {});
});

describe('do_addr_validate', () => {
  it('works', async () => {
    const vm = await createVM();
    const addr_ptr = writeData(
      vm,
      toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
    );
    const result = vm.addr_validate(addr_ptr.ptr);
    expect(result).toEqual(0);
  });

  it('fails for invalid address', async () => {
    try {
      const vm = await createVM();
      const addr_ptr = writeData(
        vm,
        toAscii('ggggg14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
      );
      const result = vm.addr_validate(addr_ptr.ptr);
      expect(result).toEqual(0);
    } catch (e) {
      expect(e).toEqual(
        new Error(
          'Invalid checksum for ggggg14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76'
        )
      );
    }
  });
});

describe('do_addr_canonicalize', () => {
  it('works', () => {});
  it('fails for large inputs', () => {});
  it('fails for small destination region', () => {});
});

describe('do_addr_humanize', () => {
  it('works', () => {});
  it('fails for invalid address', () => {});
  it('fails for too large address', () => {});
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
