/* Constants from https://github.com/cosmwasm/cosmwasm/blob/5e04c3c1aa7e278626196de43aa18e9bedbc6000/packages/vm/src/imports.rs#L499 */
import { readFileSync } from 'fs';
import { fromHex, toAscii, fromAscii } from '@cosmjs/encoding';
import {
  BasicBackendApi,
  BasicQuerier,
  BasicKVIterStorage,
  IBackend,
  Order,
} from '../src/backend';
import {
  MAX_LENGTH_CANONICAL_ADDRESS,
  MAX_LENGTH_HUMAN_ADDRESS,
  Region,
  VMInstance,
} from '../src';
import bytesToNumber from '../src/lib/bytes-to-number';

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

const EDDSA_MSG_HEX = fromHex('');
const EDDSA_SIG_HEX = fromHex(
  'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b'
);
const EDDSA_PUBKEY_HEX = fromHex(
  'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'
);

const SECP256K1_MSG_HEX = fromHex(
  '5ae8317d34d1e595e3fa7247db80c0af4320cce1116de187f8f7e2e099c0d8d0'
);
const SECP256K1_SIG_HEX = fromHex(
  '45c0b7f8c09a9e1f1cea0c25785594427b6bf8f9f878a8af0b1abbb48e16d0920d8becd0c220f67c51217eecfd7184ef0732481c843857e6bc7fc095c4f6b788'
);
const RECOVER_PARAM = 1;
const SECP256K1_PUBKEY_HEX = fromHex(
  '044a071e8a6e10aada2b8cf39fa3b5fb3400b04e99ea8ae64ceea1a977dbeaf5d5f8c8fbd10b71ab14cd561f7df8eb6da50f8a8d81ba564342244d26d1d4211595'
);

const ED25519_MSG_HEX = fromHex('72');
const ED25519_SIG_HEX = fromHex(
  '92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00'
);
const ED25519_PUBKEY_HEX = fromHex(
  '3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c'
);

export const createVM = async (): Promise<VMInstance> => {
  const wasm_byte_code = readFileSync('testdata/hackatom.wasm');
  const backend: IBackend = {
    backend_api: new BasicBackendApi('terra'),
    storage: new BasicKVIterStorage(),
    querier: new BasicQuerier(),
  };

  const vm = new VMInstance(backend);
  vm.backend.storage.set(KEY1, VALUE1);
  vm.backend.storage.set(KEY2, VALUE2);

  await vm.build(wasm_byte_code);
  return vm;
};

export const writeData = (vm: VMInstance, data: Uint8Array): Region => {
  // vm.backend.storage.set(data, VALUE1);
  return vm.allocate_bytes(data);
};

export const writeObject = (vm: VMInstance, data: [Uint8Array]): Region => {
  return vm.allocate_json(data);
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
        new Error('Key length 1664000 exceeds maximum length 65536')
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

  it('fails to remove non-existent key', async () => {
    try {
      const key_ptr = writeData(vm, toAscii('I do not exist in storage'));
      vm.do_db_remove(key_ptr);
      vm.backend.storage.get(toAscii('I do not exist in storage'));
    } catch (e) {
      expect(e).toEqual(
        new Error(`Key ${toAscii('I do not exist in storage')} not found`)
      );
    }
  });

  it('fails for large key', () => {
    try {
      const key_ptr = writeData(
        vm,
        toAscii('I do not exist in storage'.repeat(65 * 1024))
      );
      vm.do_db_remove(key_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error(`Key length 1664000 exceeds maximum length 65536.`)
      );
    }
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
      vm.allocate(MAX_LENGTH_CANONICAL_ADDRESS)
    );
    expect(result.ptr).toEqual(0);
  });

  it('fails for small inputs', () => {
    try {
      const human_addr_region = writeData(vm, toAscii('terra'));
      vm.do_addr_canonicalize(
        human_addr_region,
        vm.allocate(MAX_LENGTH_CANONICAL_ADDRESS)
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
        vm.allocate(MAX_LENGTH_CANONICAL_ADDRESS)
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
        vm.allocate(MAX_LENGTH_CANONICAL_ADDRESS - 50)
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
        vm.allocate(MAX_LENGTH_HUMAN_ADDRESS)
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
    const destination = vm.allocate(MAX_LENGTH_HUMAN_ADDRESS);
    const result = vm.do_addr_humanize(canonical_addr_region, destination);
    expect(result.ptr).toEqual(0);
  });

  it('fails for invalid address', () => {
    try {
      const canonical_addr_region = writeData(
        vm,
        toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq77')
      );
      vm.do_addr_humanize(
        canonical_addr_region,
        vm.allocate(MAX_LENGTH_HUMAN_ADDRESS)
      );
    } catch (e) {
      expect(e).toEqual(
        new Error('human_address: canonical address length not correct: 44')
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
        vm.allocate(MAX_LENGTH_HUMAN_ADDRESS)
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
        vm.allocate(MAX_LENGTH_HUMAN_ADDRESS)
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
        vm.allocate(MAX_LENGTH_HUMAN_ADDRESS)
      );
    } catch (e) {
      expect(e).toEqual(new Error('Empty address.'));
    }
  });

  it('fails for small destination region', () => {
    try {
      const canonical_addr_region = writeData(
        vm,
        new Uint8Array(54).fill(0x22)
      );
      vm.do_addr_humanize(canonical_addr_region, vm.allocate(0));
    } catch (e) {
      expect(e).toEqual(new RangeError('offset is out of bounds'));
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
    const hash = ECDSA_HASH_HEX;
    hash[0] ^= 0x01;
    const hash_ptr = writeData(vm, hash);
    const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
    const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
    const result = vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(1);
  });

  it('fails for large hash', () => {
    try {
      const hash = new Uint8Array([...ECDSA_HASH_HEX, 0x00]);
      const hash_ptr = writeData(vm, hash);
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
    const sig = ECDSA_SIG_HEX;
    sig[0] ^= 0x01;
    const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
    const sig_ptr = writeData(vm, sig);
    const pubkey_ptr = writeData(vm, ECDSA_PUBKEY_HEX);
    const result = vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(1);
  });

  it('fails for large signature', () => {
    try {
      const sig = new Uint8Array([...ECDSA_SIG_HEX, 0x00]);
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, sig);
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
      const pubKey = ECDSA_PUBKEY_HEX;
      pubKey[0] ^= 0x01;
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, pubKey);
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Public Key could not be parsed'));
    }
  });

  it('fails for invalid pubkey', () => {
    try {
      const pubKey = ECDSA_PUBKEY_HEX;
      pubKey[1] ^= 0x01;
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, pubKey);
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Public Key could not be parsed'));
    }
  });

  it('fails for large pubkey', () => {
    try {
      const pubKey = new Uint8Array([...ECDSA_PUBKEY_HEX, 0x00]);
      const hash_ptr = writeData(vm, ECDSA_HASH_HEX);
      const sig_ptr = writeData(vm, ECDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, pubKey);
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(
        new Error(
          'Expected public key to be an Uint8Array with length [33, 65]'
        )
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

  it('fails for wrong data', () => {
    try {
      const hash_ptr = writeData(vm, new Uint8Array(32).fill(0x22));
      const sig_ptr = writeData(vm, new Uint8Array(64).fill(0x22));
      const pubkey_ptr = writeData(vm, new Uint8Array(65).fill(0x22));
      vm.do_secp256k1_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Public Key could not be parsed'));
    }
  });
});

describe('do_ed25519_verify', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const hash_ptr = writeData(vm, EDDSA_MSG_HEX);
    const sig_ptr = writeData(vm, EDDSA_SIG_HEX);
    const pubkey_ptr = writeData(vm, EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(0);
  });

  it('fails for invalid msg', () => {
    const hash = new Uint8Array([...EDDSA_MSG_HEX, 0x01]);
    const hash_ptr = writeData(vm, hash);
    const sig_ptr = writeData(vm, EDDSA_SIG_HEX);
    const pubkey_ptr = writeData(vm, EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(1);
  });

  it('fails for large msg', () => {
    const hash_ptr = writeData(vm, new Uint8Array(33 * 1024).fill(0x22));
    const sig_ptr = writeData(vm, EDDSA_SIG_HEX);
    const pubkey_ptr = writeData(vm, EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(1);
  });

  it('fails for wrong msg', () => {
    const msg = new Uint8Array([...EDDSA_MSG_HEX, 0x01]);
    const hash_ptr = writeData(vm, msg);
    const sig_ptr = writeData(vm, EDDSA_SIG_HEX);
    const pubkey_ptr = writeData(vm, EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(1);
  });

  it('fails for invalid sig', () => {
    const sig = EDDSA_SIG_HEX;
    sig[0] ^= 0x01;
    const hash_ptr = writeData(vm, EDDSA_MSG_HEX);
    const sig_ptr = writeData(vm, sig);
    const pubkey_ptr = writeData(vm, EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(1);
  });

  it('fails for large sig', () => {
    const sig = new Uint8Array([...EDDSA_SIG_HEX, 0x00]);
    const hash_ptr = writeData(vm, EDDSA_MSG_HEX);
    const sig_ptr = writeData(vm, sig);
    const pubkey_ptr = writeData(vm, EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(1);
  });

  it('fails for short sig', () => {
    try {
      const hash_ptr = writeData(vm, EDDSA_MSG_HEX);
      const sig_ptr = writeData(vm, new Uint8Array(32));
      const pubkey_ptr = writeData(vm, EDDSA_PUBKEY_HEX);
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for invalid pubkey', () => {
    const pub = EDDSA_PUBKEY_HEX;
    pub[1] ^= 0x01;
    const hash_ptr = writeData(vm, EDDSA_MSG_HEX);
    const sig_ptr = writeData(vm, EDDSA_SIG_HEX);
    const pubkey_ptr = writeData(vm, pub);
    const result = vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(1);
  });

  it('fails for large pubkey', () => {
    const pub = new Uint8Array([...EDDSA_PUBKEY_HEX, 0x00]);
    const hash_ptr = writeData(vm, EDDSA_MSG_HEX);
    const sig_ptr = writeData(vm, EDDSA_SIG_HEX);
    const pubkey_ptr = writeData(vm, pub);
    const result = vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(1);
  });

  it('fails for short pubkey', () => {
    try {
      const hash_ptr = writeData(vm, EDDSA_MSG_HEX);
      const sig_ptr = writeData(vm, EDDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, new Uint8Array(33));
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for empty pubkey', () => {
    try {
      const hash_ptr = writeData(vm, EDDSA_MSG_HEX);
      const sig_ptr = writeData(vm, EDDSA_SIG_HEX);
      const pubkey_ptr = writeData(vm, new Uint8Array());
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for wrong data', () => {
    try {
      const hash_ptr = writeData(vm, new Uint8Array(32).fill(0x22));
      const sig_ptr = writeData(vm, new Uint8Array(64).fill(0x22));
      const pubkey_ptr = writeData(vm, new Uint8Array(33).fill(0x22));
      vm.do_ed25519_verify(hash_ptr, sig_ptr, pubkey_ptr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });
});

describe('do_ed25519_batch_verify', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const hash_ptr = writeObject(vm, [ED25519_MSG_HEX]);
    const sig_ptr = writeObject(vm, [ED25519_SIG_HEX]);
    const pubkey_ptr = writeObject(vm, [ED25519_PUBKEY_HEX]);
    const result = vm.do_ed25519_batch_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(0);
  });

  it('fails for wrong msg', () => {
    const msg = new Uint8Array([...ED25519_MSG_HEX, 0x01]);
    const hash_ptr = writeObject(vm, [msg]);
    const sig_ptr = writeObject(vm, [ED25519_SIG_HEX]);
    const pubkey_ptr = writeObject(vm, [ED25519_PUBKEY_HEX]);
    const result = vm.do_ed25519_batch_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(1);
  });

  it('fails for invalid pubkey', () => {
    const hash_ptr = writeObject(vm, [ED25519_MSG_HEX]);
    const sig_ptr = writeObject(vm, [ED25519_SIG_HEX]);
    const pubkey_ptr = writeObject(vm, [new Uint8Array(0)]);
    const result = vm.do_ed25519_batch_verify(hash_ptr, sig_ptr, pubkey_ptr);
    expect(result).toEqual(1);
  });
});

describe('do_secp256k1_recover_pubkey', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const msg_ptr = writeData(vm, SECP256K1_MSG_HEX);
    const sig_ptr = writeData(vm, SECP256K1_SIG_HEX);
    const result = vm.do_secp256k1_recover_pubkey(
      msg_ptr,
      sig_ptr,
      RECOVER_PARAM
    );
    expect(result).toEqual(SECP256K1_PUBKEY_HEX);
  });
});

describe('do_query_chain', () => {
  it('fails for missing contract', () => {});
});

describe('db_scan', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('unbound works', () => {
    const id_region_ptr = vm.db_scan(0, 0, Order.Ascending);
    const id = fromRegionPtr(vm, id_region_ptr);
    expect(id).toBe(1);

    let item = vm.do_db_next(id);
    expectEntryToBe(KEY1, VALUE1, item);

    item = vm.do_db_next(id);
    expectEntryToBe(KEY2, VALUE2, item);

    item = vm.do_db_next(id);
    expect(item.ptr).toBe(0);
  });

  it('unbound descending works', () => {
    const id_region_ptr = vm.db_scan(0, 0, Order.Descending);
    const id = fromRegionPtr(vm, id_region_ptr);
    expect(id).toBe(1);

    let item = vm.do_db_next(id);
    expectEntryToBe(KEY2, VALUE2, item);

    item = vm.do_db_next(id);
    expectEntryToBe(KEY1, VALUE1, item);

    item = vm.do_db_next(id);
    expect(item.ptr).toBe(0);
  });

  it('bound works', () => {
    const startRegion = writeData(vm, toAscii('anna'));
    const endRegion = writeData(vm, toAscii('bert'));
    const id_region = vm.do_db_scan(startRegion, endRegion, Order.Ascending);
    const id = bytesToNumber(id_region.data);
    expect(id).toBe(1);

    let item = vm.do_db_next(id);
    expectEntryToBe(KEY1, VALUE1, item);

    item = vm.do_db_next(id);
    expect(item.ptr).toBe(0);
  });

  it('bound descending works', () => {});
  it('multiple iterators', () => {});
  it('fails for invalid order value', () => {});
});

describe('do_db_next', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {});
  it('fails for non existent id', () => {
    try {
      vm.do_db_next(0);
    } catch (e) {
      expect(e).toEqual(new Error('Iterator 0 not found.'));
    }
  });
});

// test helpers

function expectEntryToBe(expectedKey: Uint8Array, expectedValue: Uint8Array, actualItem: Region) {
  let json = JSON.parse(fromAscii(actualItem.data));
  let key = new Uint8Array(Object.values(json.key));
  let value = new Uint8Array(Object.values(json.value));

  expect(key).toStrictEqual(expectedKey);
  expect(value).toStrictEqual(expectedValue);
}

function fromRegionPtr(vm: VMInstance, regionPtr: number): number {
  const region = vm.region(regionPtr);
  return bytesToNumber(region.data);
}
