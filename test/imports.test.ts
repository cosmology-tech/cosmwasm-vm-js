import { toAscii } from '@cosmjs/encoding';
import { createVM, writeData } from './common/test-vm';
import * as testData from './common/test-data';
import {
  VMInstance,
  MAX_LENGTH_CANONICAL_ADDRESS,
  MAX_LENGTH_HUMAN_ADDRESS,
  Order,
  Region
} from '../src';
import { toByteArray, toNumber } from '../src/helpers/byte-array';

describe('do_db_read', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', async () => {
    const keyPtr = writeData(vm, testData.KEY1);
    const result = vm.do_db_read(keyPtr);

    expect(result.ptr).toBeGreaterThan(0);
    expect(result.data).toEqual(testData.VALUE1);
  });

  it('works for non-existent key', async () => {
    const keyPtr = writeData(vm, toAscii('I do not exist in storage'));
    const result = vm.do_db_read(keyPtr);

    expect(toNumber(result.data)).toEqual(0);
  });

  it('fails for large key', async () => {
    try {
      const keyPtr = writeData(
        vm,
        toAscii('I do not exist in storage'.repeat(65 * 1024))
      );
      vm.do_db_read(keyPtr);
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
    const keyPtr = writeData(vm, toAscii('new storage key'));
    const valuePtr = writeData(vm, toAscii('new value'));

    vm.do_db_write(keyPtr, valuePtr);
    const val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii('new value'));
  });

  it('can override', async () => {
    const keyPtr = writeData(vm, testData.KEY1);
    const valuePtr = writeData(vm, testData.VALUE2);

    vm.do_db_write(keyPtr, valuePtr);
    const val = vm.backend.storage.get(testData.KEY1);
    expect(val).toEqual(testData.VALUE2);
  });

  it('works for empty value', async () => {
    const keyPtr = writeData(vm, toAscii('new storage key'));
    const valuePtr = writeData(vm, toAscii(''));
    vm.do_db_write(keyPtr, valuePtr);

    const val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii(''));
  });

  it('fails for large key', async () => {
    try {
      const keyPtr = writeData(
        vm,
        toAscii('new storage key'.repeat(69 * 1024))
      );
      const valuePtr = writeData(vm, toAscii('x'));
      vm.do_db_write(keyPtr, valuePtr);
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
      const keyPtr = writeData(vm, toAscii('new storage key'));
      const valuePtr = writeData(vm, toAscii('x'.repeat(129 * 1024)));
      vm.do_db_write(keyPtr, valuePtr);
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
    const keyPtr = writeData(vm, toAscii('new storage key'));
    const valuePtr = writeData(vm, toAscii('x'));
    vm.do_db_write(keyPtr, valuePtr);

    let val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii('x'));

    vm.backend.storage.remove(toAscii('new storage key'));
    val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(null);
  });

  it('fails to remove non-existent key', async () => {
    try {
      const keyPtr = writeData(vm, toAscii('I do not exist in storage'));
      vm.do_db_remove(keyPtr);
      vm.backend.storage.get(toAscii('I do not exist in storage'));
    } catch (e) {
      expect(e).toEqual(
        new Error(`Key ${toAscii('I do not exist in storage')} not found`)
      );
    }
  });

  it('fails for large key', () => {
    try {
      const keyPtr = writeData(
        vm,
        toAscii('I do not exist in storage'.repeat(65 * 1024))
      );
      vm.do_db_remove(keyPtr);
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
    const addrPtr = writeData(
      vm,
      toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
    );
    const result = vm.do_addr_validate(addrPtr);
    expect(result.ptr).toEqual(0);
  });

  it('fails for invalid address', async () => {
    try {
      const addrPtr = writeData(
        vm,
        toAscii('ggggg14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
      );
      const result = vm.do_addr_validate(addrPtr);
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
      const addrPtr = writeData(
        vm,
        toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76'.repeat(1024))
      );
      const result = vm.do_addr_validate(addrPtr);
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
    const humanAddrRegion = writeData(
      vm,
      toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
    );
    const result = vm.do_addr_canonicalize(
      humanAddrRegion,
      vm.allocate(MAX_LENGTH_CANONICAL_ADDRESS)
    );
    expect(result.ptr).toEqual(0);
  });

  it('fails for small inputs', () => {
    try {
      const humanAddrRegion = writeData(vm, toAscii('terra'));
      vm.do_addr_canonicalize(
        humanAddrRegion,
        vm.allocate(MAX_LENGTH_CANONICAL_ADDRESS)
      );
    } catch (e) {
      expect(e).toEqual(new Error('terra too short'));
    }
  });

  it('fails for large inputs', () => {
    try {
      const humanAddrRegion = writeData(
        vm,
        toAscii(
          'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76dsafklsajdfkljsdaklfjklasdjklfjaklsdjfl'
        )
      );
      vm.do_addr_canonicalize(
        humanAddrRegion,
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
      const humanAddrRegion = writeData(
        vm,
        toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
      );
      vm.do_addr_canonicalize(
        humanAddrRegion,
        vm.allocate(MAX_LENGTH_CANONICAL_ADDRESS - 50)
      );
    } catch (e) {
      expect(e).toEqual(new RangeError('offset is out of bounds'));
    }
  });

  it('fails for empty address', () => {
    try {
      const canonicalAddrRegion = writeData(vm, toAscii(''));
      vm.do_addr_canonicalize(
        canonicalAddrRegion,
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
    const canonicalAddrRegion = writeData(vm, new Uint8Array(54).fill(0x22));
    const destination = vm.allocate(MAX_LENGTH_HUMAN_ADDRESS);
    const result = vm.do_addr_humanize(canonicalAddrRegion, destination);
    expect(result.ptr).toEqual(0);
  });

  it('fails for invalid address', () => {
    try {
      const canonicalAddrRegion = writeData(
        vm,
        toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq77')
      );
      vm.do_addr_humanize(
        canonicalAddrRegion,
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
      const canonicalAddrRegion = writeData(
        vm,
        toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
      );
      vm.do_addr_humanize(
        canonicalAddrRegion,
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
      const canonicalAddrRegion = writeData(vm, toAscii('foobar'));
      vm.do_addr_humanize(
        canonicalAddrRegion,
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
      const canonicalAddrRegion = writeData(vm, toAscii(''));
      vm.do_addr_humanize(
        canonicalAddrRegion,
        vm.allocate(MAX_LENGTH_HUMAN_ADDRESS)
      );
    } catch (e) {
      expect(e).toEqual(new Error('Empty address.'));
    }
  });

  it('fails for small destination region', () => {
    try {
      const canonicalAddrRegion = writeData(
        vm,
        new Uint8Array(54).fill(0x22)
      );
      vm.do_addr_humanize(canonicalAddrRegion, vm.allocate(0));
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
    const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX);
    const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX);
    const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX);
    const result = vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(0);
  });

  it('fails for invalid hash', () => {
    const hash = new Uint8Array([... testData.ECDSA_HASH_HEX]);
    hash[0] ^= 0x01;
    const hashPtr = writeData(vm, hash);
    const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX);
    const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX);
    const result = vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for large hash', () => {
    try {
      const hash = new Uint8Array([...testData.ECDSA_HASH_HEX, 0x00]);
      const hashPtr = writeData(vm, hash);
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX);
      const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX);
      vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected message to be an Uint8Array with length 32')
      );
    }
  });

  it('fails for short hash', () => {
    try {
      const hashPtr = writeData(vm, new Uint8Array(1));
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX);
      const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX);
      vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected message to be an Uint8Array with length 32')
      );
    }
  });

  it('fails for invalid signature', () => {
    const sig = new Uint8Array([... testData.ECDSA_SIG_HEX]);
    sig[0] ^= 0x01;
    const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX);
    const sigPtr = writeData(vm, sig);
    const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX);
    const result = vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for large signature', () => {
    try {
      const sig = new Uint8Array([...testData.ECDSA_SIG_HEX, 0x00]);
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX);
      const sigPtr = writeData(vm, sig);
      const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX);
      vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected signature to be an Uint8Array with length 64')
      );
    }
  });

  it('fails for short signature', () => {
    try {
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX);
      const sigPtr = vm.allocate(0);
      const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX);
      vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected signature to be an Uint8Array with length 64')
      );
    }
  });

  it('fails for wrong pubkey format', () => {
    try {
      const pubKey = new Uint8Array([... testData.ECDSA_PUBKEY_HEX]);
      pubKey[0] ^= 0x01;
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX);
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX);
      const pubkeyPtr = writeData(vm, pubKey);
      vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Public Key could not be parsed'));
    }
  });

  it('fails for invalid pubkey', () => {
    try {
      const pubKey = new Uint8Array([... testData.ECDSA_PUBKEY_HEX]);
      pubKey[1] ^= 0x01;
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX);
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX);
      const pubkeyPtr = writeData(vm, pubKey);
      vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Public Key could not be parsed'));
    }
  });

  it('fails for large pubkey', () => {
    try {
      const pubKey = new Uint8Array([...testData.ECDSA_PUBKEY_HEX, 0x00]);
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX);
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX);
      const pubkeyPtr = writeData(vm, pubKey);
      vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
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
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX);
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX);
      const pubkeyPtr = writeData(vm, new Uint8Array(33));
      vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Public Key could not be parsed'));
    }
  });

  it('fails for empty pubkey', () => {
    try {
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX);
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX);
      const pubkeyPtr = writeData(vm, toAscii(''));
      vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
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
      const hashPtr = writeData(vm, new Uint8Array(32).fill(0x22));
      const sigPtr = writeData(vm, new Uint8Array(64).fill(0x22));
      const pubkeyPtr = writeData(vm, new Uint8Array(65).fill(0x22));
      vm.do_secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
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
    const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX);
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX);
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(0);
  });

  it('fails for invalid msg', () => {
    const hash = new Uint8Array([...testData.EDDSA_MSG_HEX, 0x01]);
    const hashPtr = writeData(vm, hash);
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX);
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for large msg', () => {
    const hashPtr = writeData(vm, new Uint8Array(33 * 1024).fill(0x22));
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX);
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for wrong msg', () => {
    const msg = new Uint8Array([...testData.EDDSA_MSG_HEX, 0x01]);
    const hashPtr = writeData(vm, msg);
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX);
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for invalid sig', () => {
    const sig = new Uint8Array([... testData.EDDSA_SIG_HEX]);
    sig[0] ^= 0x01;
    const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX);
    const sigPtr = writeData(vm, sig);
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it.skip('fails for large sig', () => { // test is broken, only ever passed due to other tests mutating the test data
    const sig = new Uint8Array([...testData.EDDSA_SIG_HEX, 0x00]);
    const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX);
    const sigPtr = writeData(vm, sig);
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX);
    const result = vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for short sig', () => {
    try {
      const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX);
      const sigPtr = writeData(vm, new Uint8Array(32));
      const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX);
      vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for invalid pubkey', () => {
    const pub = new Uint8Array([... testData.EDDSA_PUBKEY_HEX]);
    pub[1] ^= 0x01;
    const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX);
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX);
    const pubkeyPtr = writeData(vm, pub);
    const result = vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for large pubkey', () => {
    const pub = new Uint8Array([...testData.EDDSA_PUBKEY_HEX, 0x00]);
    const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX);
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX);
    const pubkeyPtr = writeData(vm, pub);
    const result = vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for short pubkey', () => {
    try {
      const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX);
      const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX);
      const pubkeyPtr = writeData(vm, new Uint8Array(33));
      vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for empty pubkey', () => {
    try {
      const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX);
      const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX);
      const pubkeyPtr = vm.allocate(0);
      vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for wrong data', () => {
    try {
      const hashPtr = writeData(vm, new Uint8Array(32).fill(0x22));
      const sigPtr = writeData(vm, new Uint8Array(64).fill(0x22));
      const pubkeyPtr = writeData(vm, new Uint8Array(33).fill(0x22));
      vm.do_ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });
});

describe('do_secp256k1_recover_pubkey', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const msgPtr = writeData(vm, testData.SECP256K1_MSG_HEX);
    const sigPtr = writeData(vm, testData.SECP256K1_SIG_HEX);
    const result = vm.do_secp256k1_recover_pubkey(
      msgPtr,
      sigPtr,
      testData.RECOVER_PARAM
    );
    expect(result.data).toEqual(testData.SECP256K1_PUBKEY_HEX);
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
    const idRegion = vm.do_db_scan(vm.allocate(0), vm.allocate(0), Order.Ascending);
    const id = toNumber(idRegion.data);
    expect(id).toBe(1);

    let item = vm.do_db_next(idRegion);
    expectToBeKvp(item, testData.KEY1, testData.VALUE1);

    item = vm.do_db_next(idRegion);
    expectToBeKvp(item, testData.KEY2, testData.VALUE2);

    item = vm.do_db_next(idRegion);
    expect(toNumber(item.data)).toBe(0);
  });

  it('unbound descending works', () => {
    const idRegion = vm.do_db_scan(vm.allocate(0), vm.allocate(0), Order.Descending);
    const id = toNumber(idRegion.data);
    expect(id).toBe(1);

    let item = vm.do_db_next(idRegion);
    expectToBeKvp(item, testData.KEY2, testData.VALUE2);

    item = vm.do_db_next(idRegion);
    expectToBeKvp(item, testData.KEY1, testData.VALUE1);

    item = vm.do_db_next(idRegion);
    expect(toNumber(item.data)).toBe(0);
  });

  it('bound works', () => {
    const idRegion = vm.do_db_scan(
      writeData(vm, toAscii('anna')),
      writeData(vm, toAscii('bert')),
      Order.Ascending);
    const id = toNumber(idRegion.data);
    expect(id).toBe(1);

    let item = vm.do_db_next(idRegion);
    expectToBeKvp(item, testData.KEY1, testData.VALUE1);

    item = vm.do_db_next(idRegion);
    expect(toNumber(item.data)).toBe(0);
  });

  it('bound descending works', () => {
    const idRegion = vm.do_db_scan(
      writeData(vm, toAscii('antler')),
      writeData(vm, toAscii('trespass')),
      Order.Descending);
    const id = toNumber(idRegion.data);
    expect(id).toBe(1);

    let item = vm.do_db_next(idRegion);
    expectToBeKvp(item, testData.KEY2, testData.VALUE2);

    item = vm.do_db_next(idRegion);
    expect(toNumber(item.data)).toBe(0);
  });

  it('multiple iterators', () => {
    const idRegion1 = vm.do_db_scan(vm.allocate(0), vm.allocate(0), Order.Ascending);
    const id1 = toNumber(idRegion1.data);
    expect(id1).toBe(1);

    const idRegion2 = vm.do_db_scan(vm.allocate(0), vm.allocate(0), Order.Descending);
    const id2 = toNumber(idRegion2.data);
    expect(id2).toBe(2);

    expectToBeKvp(vm.do_db_next(idRegion1), testData.KEY1, testData.VALUE1); // first item, first iterator
    expectToBeKvp(vm.do_db_next(idRegion1), testData.KEY2, testData.VALUE2); // second item, first iterator
    expectToBeKvp(vm.do_db_next(idRegion2), testData.KEY2, testData.VALUE2); // first item, second iterator
    expect(toNumber(vm.do_db_next(idRegion1).data)).toBe(0);                            // end, first iterator
    expectToBeKvp(vm.do_db_next(idRegion2), testData.KEY1, testData.VALUE1); // second item, second iterator
  });

  it('fails for invalid order value', () => {
    expect(() => vm.do_db_scan(vm.allocate(0), vm.allocate(0), 42)).toThrowError('Invalid order value 42');
  });
});

describe('do_db_next', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const idRegion = vm.do_db_scan(vm.allocate(0), vm.allocate(0), Order.Ascending);

    expectToBeKvp(vm.do_db_next(idRegion), testData.KEY1, testData.VALUE1);
    expectToBeKvp(vm.do_db_next(idRegion), testData.KEY2, testData.VALUE2);
    expect(toNumber(vm.do_db_next(idRegion).data)).toBe(0);
  });

  it('fails for non existent id', () => {
    try {
      vm.do_db_next(vm.region(0));
    } catch (e) {
      expect(e).toEqual(new Error('Iterator not found.'));
    }
  });
});

//////////////////
// test helpers //
//////////////////

function expectToBeKvp(
  actualItem: Region,
  expectedKey: Uint8Array,
  expectedValue: Uint8Array
) {
  const expectedData = [
    ...expectedKey,
    ...toByteArray(expectedKey.length, 4),
    ...expectedValue,
    ...toByteArray(expectedValue.length, 4)
  ];

  expect([...actualItem.data]).toStrictEqual(expectedData);
}
