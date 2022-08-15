/* Constants from https://github.com/cosmwasm/cosmwasm/blob/5e04c3c1aa7e278626196de43aa18e9bedbc6000/packages/vm/src/imports.rs#L499 */
import { readFileSync } from 'fs';
import {
  BasicBackendApi,
  BasicKVStorage,
  BasicQuerier,
  IBackend,
} from '../src/backend';
import { Region, VMInstance } from '../src';
import { fromHex, toAscii } from '@cosmjs/encoding';

// In Rust, b"XXX" is the same as creating a bytestring of the ASCII-encoded string "XXX".
const KEY1 = toAscii('ant');
const VALUE1 = toAscii('insect');
const KEY2 = toAscii('tree');
const VALUE2 = toAscii('plant');
const ECDSA_HASH_HEX = fromHex(
  '5ae8317d34d1e595e3fa7247db80c0af4320cce1116de187f8f7e2e099c0d8d0'
);
const ECDSA_SIG_HEX = fromHex(
  '207082eb2c3dfa0b454e0906051270ba4074ac93760ba9e7110cd9471475111151eb0dbbc9920e72146fb564f99d039802bf6ef2561446eb126ef364d21ee9c4'
);
const ECDSA_PUBKEY_HEX = fromHex(
  '04051c1ee2190ecfb174bfe4f90763f2b4ff7517b70a2aec1876ebcfd644c4633fb03f3cfbd94b1f376e34592d9d41ccaf640bb751b00a1fadeb0c01157769eb73'
);

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

describe('do_db_read', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', async () => {
    const key_ptr = writeData(vm, KEY1);
    const result = vm.do_db_read(key_ptr);

    expect(result.ptr).toBeGreaterThan(0);
    expect(result.data).toEqual(VALUE1);
  });

  it('works for non-existent key', async () => {
    const key_ptr = writeData(vm, toAscii('I do not exist in storage'));
    const result = vm.do_db_read(key_ptr);

    expect(result.ptr).toEqual(0);
  });

  it('fails for large key', async () => {
    try {
      const key_ptr = writeData(
        vm,
        toAscii('I do not exist in storage'.repeat(65 * 1024))
      );
      vm.do_db_read(key_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error(
          `Key too long: ${'I do not exist in storage'.repeat(65 * 1024)}`
        )
      );
    }
  });
});

describe('do_db_write', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', async () => {
    const key_ptr = writeData(vm, toAscii('new storage key'));
    const value_ptr = writeData(vm, toAscii('new value'));

    vm.do_db_write(key_ptr, value_ptr);
    const val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii('new value'));
  });

  it('can override', async () => {
    const key_ptr = writeData(vm, KEY1);
    const value_ptr = writeData(vm, VALUE2);

    vm.do_db_write(key_ptr, value_ptr);
    const val = vm.backend.storage.get(KEY1);
    expect(val).toEqual(VALUE2);
  });

  it('works for empty value', async () => {
    const key_ptr = writeData(vm, toAscii('new storage key'));
    const value_ptr = writeData(vm, toAscii(''));
    vm.do_db_write(key_ptr, value_ptr);

    const val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii(''));
  });

  it('fails for large key', async () => {
    try {
      const key_ptr = writeData(
        vm,
        toAscii('new storage key'.repeat(69 * 1024))
      );
      const value_ptr = writeData(vm, toAscii('x'));
      vm.do_db_write(key_ptr, value_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error(
          'db_write: key too large: ' + 'new storage key'.repeat(69 * 1024)
        )
      );
    }
  });

  // The key is overridden by the value, so the value exception is never reached.
  it('fails for large value', async () => {
    try {
      const key_ptr = writeData(vm, toAscii('new storage key'));
      const value_ptr = writeData(vm, toAscii('x'.repeat(129 * 1024)));
      vm.do_db_write(key_ptr, value_ptr);
    } catch (e: any) {
      expect(e.message).toContain('db_write: value too large:');
    }
  });

  // TODO: is prohibited in readonly contexts
});

describe('do_db_remove', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', async () => {
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
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', async () => {
    const addr_ptr = writeData(
      vm,
      toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
    );
    const result = vm.do_addr_validate(addr_ptr);
    expect(result.ptr).toEqual(0);
  });

  it('fails for invalid address', async () => {
    try {
      const addr_ptr = writeData(
        vm,
        toAscii('ggggg14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
      );
      const result = vm.do_addr_validate(addr_ptr);
      expect(result).toEqual(0);
    } catch (e) {
      expect(e).toEqual(
        new Error(
          'Invalid checksum for ggggg14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76'
        )
      );
    }
  });

  it('fails for large input', async () => {
    try {
      const addr_ptr = writeData(
        vm,
        toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76'.repeat(1024))
      );
      const result = vm.do_addr_validate(addr_ptr);
      expect(result).toEqual(0);
    } catch (e) {
      expect(e).toEqual(
        new Error(
          'Address too large: ' +
            'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76'.repeat(1024)
        )
      );
    }
  });
});

describe('do_addr_canonicalize', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const human_addr_region = writeData(
      vm,
      toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
    );
    const result = vm.do_addr_canonicalize(
      human_addr_region,
      vm.allocate(vm.MAX_LENGTH_CANONICAL_ADDRESS)
    );
    expect(result.ptr).toEqual(0);
  });

  it('fails for small inputs', () => {
    try {
      const human_addr_region = writeData(vm, toAscii('terra'));
      vm.do_addr_canonicalize(
        human_addr_region,
        vm.allocate(vm.MAX_LENGTH_CANONICAL_ADDRESS)
      );
    } catch (e) {
      expect(e).toEqual(new Error('terra too short'));
    }
  });

  it('fails for large inputs', () => {
    try {
      const human_addr_region = writeData(
        vm,
        toAscii(
          'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76dsafklsajdfkljsdaklfjklasdjklfjaklsdjfl'
        )
      );
      vm.do_addr_canonicalize(
        human_addr_region,
        vm.allocate(vm.MAX_LENGTH_CANONICAL_ADDRESS)
      );
    } catch (e) {
      expect(e).toEqual(
        new Error(
          'Invalid checksum for terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76dsafklsajdfkljsdaklfjklasdjklfjaklsdjfl'
        )
      );
    }
  });

  it('fails for small destination region', () => {
    try {
      const human_addr_region = writeData(
        vm,
        toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
      );
      vm.do_addr_canonicalize(
        human_addr_region,
        vm.allocate(vm.MAX_LENGTH_CANONICAL_ADDRESS - 50)
      );
    } catch (e) {
      expect(e).toEqual(new RangeError('offset is out of bounds'));
    }
  });

  it('fails for empty address', () => {
    try {
      const canonical_addr_region = writeData(vm, toAscii(''));
      vm.do_addr_canonicalize(
        canonical_addr_region,
        vm.allocate(vm.MAX_LENGTH_HUMAN_ADDRESS)
      );
    } catch (e) {
      expect(e).toEqual(new Error('Empty address.'));
    }
  });
});

describe('do_addr_humanize', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const canonical_addr_region = writeData(vm, new Uint8Array(54).fill(0x22));
    const destination = vm.allocate(vm.MAX_LENGTH_HUMAN_ADDRESS);
    const result = vm.do_addr_humanize(canonical_addr_region, destination);
    expect(result).toEqual(0);
  });

  it('fails for invalid address', () => {
    try {
      const canonical_addr_region = writeData(
        vm,
        toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq77')
      );
      vm.do_addr_humanize(
        canonical_addr_region,
        vm.allocate(vm.MAX_LENGTH_HUMAN_ADDRESS)
      );
    } catch (e) {
      expect(e).toEqual(
        new Error(
          'Invalid checksum for terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq77'
        )
      );
    }
  });

  it('fails for too large address', () => {
    try {
      const canonical_addr_region = writeData(
        vm,
        toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
      );
      vm.do_addr_humanize(
        canonical_addr_region,
        vm.allocate(vm.MAX_LENGTH_HUMAN_ADDRESS)
      );
    } catch (e) {
      expect(e).toEqual(
        new Error('human_address: canonical address length not correct: 44')
      );
    }
  });

  it('fails for too short address', () => {
    try {
      const canonical_addr_region = writeData(vm, toAscii('foobar'));
      vm.do_addr_humanize(
        canonical_addr_region,
        vm.allocate(vm.MAX_LENGTH_HUMAN_ADDRESS)
      );
    } catch (e) {
      expect(e).toEqual(
        new Error('human_address: canonical address length not correct: 6')
      );
    }
  });

  it('fails for empty address', () => {
    try {
      const canonical_addr_region = writeData(vm, toAscii(''));
      vm.do_addr_humanize(
        canonical_addr_region,
        vm.allocate(vm.MAX_LENGTH_HUMAN_ADDRESS)
      );
    } catch (e) {
      expect(e).toEqual(new Error('Empty address.'));
    }
  });
});

describe('do_secp256k1_verify', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
    const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
    const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
    const result = vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(0);
  });

  it('fails for invalid hash', () => {
    try {
      const hash_ptr = writeData(vm, new Uint8Array(0x20));
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Invalid hash'));
    }
  });
  it('fails for large hash', () => {
    try {
      const hash_ptr = writeData(vm, new Uint8Array(54 * 1024).fill(0x22));
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected message to be an Uint8Array with length 32')
      );
    }
  });

  it('fails for short hash', () => {
    try {
      const hash_ptr = writeData(vm, new Uint8Array(1));
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected message to be an Uint8Array with length 32')
      );
    }
  });
  it('fails for invalid signature', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, new Uint8Array(0x20));
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected signature to be an Uint8Array with length 64')
      );
    }
  });

  it('fails for large signature', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, new Uint8Array(54 * 1024).fill(0x22));
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected signature to be an Uint8Array with length 64')
      );
    }
  });

  it('fails for short signature', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, new Uint8Array(0));
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected signature to be an Uint8Array with length 64')
      );
    }
  });
  it('fails for wrong pubkey format', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, new Uint8Array(0x20));
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error(
          'Expected public key to be an Uint8Array with length [33, 65]'
        )
      );
    }
  });

  it('fails for invalid pubkey', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, new Uint8Array(0x20).fill(0x22));
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error(
          'Expected public key to be an Uint8Array with length [33, 65]'
        )
      );
    }
  });

  it('fails for large pubkey', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, new Uint8Array(65 * 1024).fill(0x22));
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected signature to be an Uint8Array with length 64')
      );
    }
  });

  it('failes for short pubkey', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, new Uint8Array(33));
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Public Key could not be parsed'));
    }
  });

  it('fails for empty pubkey', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, toAscii(''));
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error(
          'Expected public key to be an Uint8Array with length [33, 65]'
        )
      );
    }
  });
});

describe('do_ecdsa_verify', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
    const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
    const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(0);
  });

  it('fails for invalid msg', () => {
    try {
      const hash_ptr = writeData(vm, new Uint8Array(0));
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });
  it('fails for large msg', () => {
    try {
      const hash_ptr = writeData(vm, new Uint8Array(33 * 1024).fill(0x22));
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });
  it('fails for short msg', () => {
    try {
      const hash_ptr = writeData(vm, new Uint8Array(32));
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for invalid sig', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, new Uint8Array(0));
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for large sig', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, new Uint8Array(64 * 1024).fill(0x22));
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for short sig', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, new Uint8Array(32));
      const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for invalid pubkey', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, new Uint8Array(0));
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  // TODO: This test takes forever due to the large pubkey.
  it.skip('fails for large pubkey', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, new Uint8Array(65 * 1024).fill(0x22));
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for short pubkey', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, new Uint8Array(33));
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for empty pubkey', () => {
    try {
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, new Uint8Array());
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });
});

describe('do_secp256k1_recover_pubkey', () => {
  it('works', () => {});
});

describe('do_query_chain', () => {
  it('fails for missing contract', () => {});
});

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
  it('fails for non existent id', () => {});
});
