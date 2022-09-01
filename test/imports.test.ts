import { toAscii, fromAscii } from '@cosmjs/encoding';
import { createVM, writeData, writeObject } from './common/test-vm';
import * as testData from './common/test-data';
import {
  VMInstance,
  MAX_LENGTH_CANONICAL_ADDRESS,
  MAX_LENGTH_HUMAN_ADDRESS,
  Order,
  Region
} from '../src';
import { toNumber } from '../src/helpers/byte-array';

describe('db_read', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', async () => {
    const keyPtr = writeData(vm, testData.KEY1).ptr;
    const resultPtr = vm.db_read(keyPtr);
    expect(resultPtr).toBeGreaterThan(0);

    const result = vm.region(resultPtr);
    expect(result.data).toEqual(testData.VALUE1);
  });

  it('works for non-existent key', async () => {
    const keyPtr = writeData(vm, toAscii('I do not exist in storage')).ptr;
    const resultPtr = vm.db_read(keyPtr);
    expect(resultPtr).toEqual(0);
  });

  it('fails for large key', async () => {
    try {
      const keyPtr = writeData(
        vm,
        toAscii('I do not exist in storage'.repeat(65 * 1024))
      ).ptr;
      vm.db_read(keyPtr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Key length 1664000 exceeds maximum length 65536')
      );
    }
  });
});

describe('db_write', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', async () => {
    const keyPtr = writeData(vm, toAscii('new storage key')).ptr;
    const valuePtr = writeData(vm, toAscii('new value')).ptr;

    vm.db_write(keyPtr, valuePtr);
    const val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii('new value'));
  });

  it('can override', async () => {
    const keyPtr = writeData(vm, testData.KEY1).ptr;
    const valuePtr = writeData(vm, testData.VALUE2).ptr;

    vm.db_write(keyPtr, valuePtr);
    const val = vm.backend.storage.get(testData.KEY1);
    expect(val).toEqual(testData.VALUE2);
  });

  it('works for empty value', async () => {
    const keyPtr = writeData(vm, toAscii('new storage key')).ptr;
    const valuePtr = writeData(vm, toAscii('')).ptr;
    vm.db_write(keyPtr, valuePtr);

    const val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii(''));
  });

  it('fails for large key', async () => {
    try {
      const keyPtr = writeData(
        vm,
        toAscii('new storage key'.repeat(69 * 1024))
      ).ptr;
      const valuePtr = writeData(vm, toAscii('x')).ptr;
      vm.db_write(keyPtr, valuePtr);
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
      const keyPtr = writeData(vm, toAscii('new storage key')).ptr;
      const valuePtr = writeData(vm, toAscii('x'.repeat(129 * 1024))).ptr;
      vm.db_write(keyPtr, valuePtr);
    } catch (e: any) {
      expect(e.message).toContain('db_write: value too large:');
    }
  });

  // TODO: is prohibited in readonly contexts
});

describe('db_remove', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', async () => {
    const keyPtr = writeData(vm, toAscii('new storage key')).ptr;
    const valuePtr = writeData(vm, toAscii('x')).ptr;
    vm.db_write(keyPtr, valuePtr);

    let val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(toAscii('x'));

    vm.backend.storage.remove(toAscii('new storage key'));
    val = vm.backend.storage.get(toAscii('new storage key'));
    expect(val).toEqual(null);
  });

  it('fails to remove non-existent key', async () => {
    try {
      const keyPtr = writeData(vm, toAscii('I do not exist in storage')).ptr;
      vm.db_remove(keyPtr);
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
      ).ptr;
      vm.db_remove(keyPtr);
    } catch (e) {
      expect(e).toEqual(
        new Error(`Key length 1664000 exceeds maximum length 65536.`)
      );
    }
  });

  it('is prohibited in readonly contexts', () => {});
});

describe('addr_validate', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', async () => {
    const addrPtr = writeData(
      vm,
      toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
    ).ptr;
    const result = vm.addr_validate(addrPtr);
    expect(result).toEqual(0);
  });

  it('fails for invalid address', async () => {
    try {
      const addrPtr = writeData(
        vm,
        toAscii('ggggg14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
      ).ptr;
      const result = vm.addr_validate(addrPtr);
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
      ).ptr;
      const result = vm.addr_validate(addrPtr);
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

describe('addr_canonicalize', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const humanAddrRegion = writeData(
      vm,
      toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76')
    ).ptr;
    const result = vm.addr_canonicalize(
      humanAddrRegion,
      vm.allocate(MAX_LENGTH_CANONICAL_ADDRESS).ptr
    );
    expect(result).toEqual(0);
  });

  it('fails for small inputs', () => {
    try {
      const humanAddrRegion = writeData(vm, toAscii('terra')).ptr;
      vm.addr_canonicalize(
        humanAddrRegion,
        vm.allocate(MAX_LENGTH_CANONICAL_ADDRESS).ptr
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
      ).ptr;
      vm.addr_canonicalize(
        humanAddrRegion,
        vm.allocate(MAX_LENGTH_CANONICAL_ADDRESS).ptr
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
      ).ptr;
      vm.addr_canonicalize(
        humanAddrRegion,
        vm.allocate(MAX_LENGTH_CANONICAL_ADDRESS - 50).ptr
      );
    } catch (e) {
      expect(e).toEqual(new RangeError('offset is out of bounds'));
    }
  });

  it('fails for empty address', () => {
    try {
      const canonicalAddrRegion = writeData(vm, toAscii('')).ptr;
      vm.addr_canonicalize(
        canonicalAddrRegion,
        vm.allocate(MAX_LENGTH_HUMAN_ADDRESS).ptr
      );
    } catch (e) {
      expect(e).toEqual(new Error('Empty address.'));
    }
  });
});

describe('addr_humanize', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const canonicalAddrRegion = writeData(vm, new Uint8Array(54).fill(0x22)).ptr;
    const destination = vm.allocate(MAX_LENGTH_HUMAN_ADDRESS).ptr;
    const result = vm.addr_humanize(canonicalAddrRegion, destination);
    expect(result).toEqual(0);
  });

  it('fails for invalid address', () => {
    try {
      const canonicalAddrRegion = writeData(
        vm,
        toAscii('terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq77')
      ).ptr;
      vm.addr_humanize(
        canonicalAddrRegion,
        vm.allocate(MAX_LENGTH_HUMAN_ADDRESS).ptr
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
      ).ptr;
      vm.addr_humanize(
        canonicalAddrRegion,
        vm.allocate(MAX_LENGTH_HUMAN_ADDRESS).ptr
      );
    } catch (e) {
      expect(e).toEqual(
        new Error('human_address: canonical address length not correct: 44')
      );
    }
  });

  it('fails for too short address', () => {
    try {
      const canonicalAddrRegion = writeData(vm, toAscii('foobar')).ptr;
      vm.addr_humanize(
        canonicalAddrRegion,
        vm.allocate(MAX_LENGTH_HUMAN_ADDRESS).ptr
      );
    } catch (e) {
      expect(e).toEqual(
        new Error('human_address: canonical address length not correct: 6')
      );
    }
  });

  it('fails for empty address', () => {
    try {
      const canonicalAddrRegion = writeData(vm, toAscii('')).ptr;
      vm.addr_humanize(
        canonicalAddrRegion,
        vm.allocate(MAX_LENGTH_HUMAN_ADDRESS).ptr
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
      ).ptr;
      vm.addr_humanize(canonicalAddrRegion, vm.allocate(0).ptr);
    } catch (e) {
      expect(e).toEqual(new RangeError('offset is out of bounds'));
    }
  });
});

describe('secp256k1_verify', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX).ptr;
    const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX).ptr;
    const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX).ptr;
    const result = vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(0);
  });

  it('fails for invalid hash', () => {
    const hash = testData.ECDSA_HASH_HEX;
    hash[0] ^= 0x01;
    const hashPtr = writeData(vm, hash).ptr;
    const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX).ptr;
    const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX).ptr;
    const result = vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for large hash', () => {
    try {
      const hash = new Uint8Array([...testData.ECDSA_HASH_HEX, 0x00]);
      const hashPtr = writeData(vm, hash).ptr;
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX).ptr;
      const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX).ptr;
      vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected message to be an Uint8Array with length 32')
      );
    }
  });

  it('fails for short hash', () => {
    try {
      const hashPtr = writeData(vm, new Uint8Array(1)).ptr;
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX).ptr;
      const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX).ptr;
      vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected message to be an Uint8Array with length 32')
      );
    }
  });

  it('fails for invalid signature', () => {
    const sig = testData.ECDSA_SIG_HEX;
    sig[0] ^= 0x01;
    const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX).ptr;
    const sigPtr = writeData(vm, sig).ptr;
    const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX).ptr;
    const result = vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for large signature', () => {
    try {
      const sig = new Uint8Array([...testData.ECDSA_SIG_HEX, 0x00]);
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX).ptr;
      const sigPtr = writeData(vm, sig).ptr;
      const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX).ptr;
      vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected signature to be an Uint8Array with length 64')
      );
    }
  });

  it('fails for short signature', () => {
    try {
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX).ptr;
      const sigPtr = writeData(vm, new Uint8Array(0)).ptr;
      const pubkeyPtr = writeData(vm, testData.ECDSA_PUBKEY_HEX).ptr;
      vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(
        new Error('Expected signature to be an Uint8Array with length 64')
      );
    }
  });

  it('fails for wrong pubkey format', () => {
    try {
      const pubKey = testData.ECDSA_PUBKEY_HEX;
      pubKey[0] ^= 0x01;
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX).ptr;
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX).ptr;
      const pubkeyPtr = writeData(vm, pubKey).ptr;
      vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Public Key could not be parsed'));
    }
  });

  it('fails for invalid pubkey', () => {
    try {
      const pubKey = testData.ECDSA_PUBKEY_HEX;
      pubKey[1] ^= 0x01;
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX).ptr;
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX).ptr;
      const pubkeyPtr = writeData(vm, pubKey).ptr;
      vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Public Key could not be parsed'));
    }
  });

  it('fails for large pubkey', () => {
    try {
      const pubKey = new Uint8Array([...testData.ECDSA_PUBKEY_HEX, 0x00]);
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX).ptr;
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX).ptr;
      const pubkeyPtr = writeData(vm, pubKey).ptr;
      vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
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
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX).ptr;
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX).ptr;
      const pubkeyPtr = writeData(vm, new Uint8Array(33)).ptr;
      vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Public Key could not be parsed'));
    }
  });

  it('fails for empty pubkey', () => {
    try {
      const hashPtr = writeData(vm, testData.ECDSA_HASH_HEX).ptr;
      const sigPtr = writeData(vm, testData.ECDSA_SIG_HEX).ptr;
      const pubkeyPtr = writeData(vm, toAscii('')).ptr;
      vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
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
      const hashPtr = writeData(vm, new Uint8Array(32).fill(0x22)).ptr;
      const sigPtr = writeData(vm, new Uint8Array(64).fill(0x22)).ptr;
      const pubkeyPtr = writeData(vm, new Uint8Array(65).fill(0x22)).ptr;
      vm.secp256k1_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Public Key could not be parsed'));
    }
  });
});

describe('ed25519_verify', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX).ptr;
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX).ptr;
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX).ptr;
    const result = vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(0);
  });

  it('fails for invalid msg', () => {
    const hash = new Uint8Array([...testData.EDDSA_MSG_HEX, 0x01]);
    const hashPtr = writeData(vm, hash).ptr;
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX).ptr;
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX).ptr;
    const result = vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for large msg', () => {
    const hashPtr = writeData(vm, new Uint8Array(33 * 1024).fill(0x22)).ptr;
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX).ptr;
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX).ptr;
    const result = vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for wrong msg', () => {
    const msg = new Uint8Array([...testData.EDDSA_MSG_HEX, 0x01]);
    const hashPtr = writeData(vm, msg).ptr;
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX).ptr;
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX).ptr;
    const result = vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for invalid sig', () => {
    const sig = testData.EDDSA_SIG_HEX;
    sig[0] ^= 0x01;
    const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX).ptr;
    const sigPtr = writeData(vm, sig).ptr;
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX).ptr;
    const result = vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for large sig', () => {
    const sig = new Uint8Array([...testData.EDDSA_SIG_HEX, 0x00]);
    const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX).ptr;
    const sigPtr = writeData(vm, sig).ptr;
    const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX).ptr;
    const result = vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for short sig', () => {
    try {
      const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX).ptr;
      const sigPtr = writeData(vm, new Uint8Array(32)).ptr;
      const pubkeyPtr = writeData(vm, testData.EDDSA_PUBKEY_HEX).ptr;
      vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for invalid pubkey', () => {
    const pub = testData.EDDSA_PUBKEY_HEX;
    pub[1] ^= 0x01;
    const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX).ptr;
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX).ptr;
    const pubkeyPtr = writeData(vm, pub).ptr;
    const result = vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for large pubkey', () => {
    const pub = new Uint8Array([...testData.EDDSA_PUBKEY_HEX, 0x00]);
    const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX).ptr;
    const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX).ptr;
    const pubkeyPtr = writeData(vm, pub).ptr;
    const result = vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for short pubkey', () => {
    try {
      const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX).ptr;
      const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX).ptr;
      const pubkeyPtr = writeData(vm, new Uint8Array(33)).ptr;
      vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for empty pubkey', () => {
    try {
      const hashPtr = writeData(vm, testData.EDDSA_MSG_HEX).ptr;
      const sigPtr = writeData(vm, testData.EDDSA_SIG_HEX).ptr;
      const pubkeyPtr = writeData(vm, new Uint8Array()).ptr;
      vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });

  it('fails for wrong data', () => {
    try {
      const hashPtr = writeData(vm, new Uint8Array(32).fill(0x22)).ptr;
      const sigPtr = writeData(vm, new Uint8Array(64).fill(0x22)).ptr;
      const pubkeyPtr = writeData(vm, new Uint8Array(33).fill(0x22)).ptr;
      vm.ed25519_verify(hashPtr, sigPtr, pubkeyPtr);
    } catch (e) {
      expect(e).toEqual(new Error('Assertion failed'));
    }
  });
});

describe('ed25519_batch_verify', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const hashPtr = writeObject(vm, [testData.ED25519_MSG_HEX]).ptr;
    const sigPtr = writeObject(vm, [testData.ED25519_SIG_HEX]).ptr;
    const pubkeyPtr = writeObject(vm, [testData.ED25519_PUBKEY_HEX]).ptr;
    const result = vm.ed25519_batch_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(0);
  });

  it('fails for wrong msg', () => {
    const msg = new Uint8Array([...testData.ED25519_MSG_HEX, 0x01]);
    const hashPtr = writeObject(vm, [msg]).ptr;
    const sigPtr = writeObject(vm, [testData.ED25519_SIG_HEX]).ptr;
    const pubkeyPtr = writeObject(vm, [testData.ED25519_PUBKEY_HEX]).ptr;
    const result = vm.ed25519_batch_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });

  it('fails for invalid pubkey', () => {
    const hashPtr = writeObject(vm, [testData.ED25519_MSG_HEX]).ptr;
    const sigPtr = writeObject(vm, [testData.ED25519_SIG_HEX]).ptr;
    const pubkeyPtr = writeObject(vm, [new Uint8Array(0)]).ptr;
    const result = vm.ed25519_batch_verify(hashPtr, sigPtr, pubkeyPtr);
    expect(result).toEqual(1);
  });
});

describe('secp256k1_recover_pubkey', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const msgPtr = writeData(vm, testData.SECP256K1_MSG_HEX).ptr;
    const sigPtr = writeData(vm, testData.SECP256K1_SIG_HEX).ptr;
    const result = vm.secp256k1_recover_pubkey(
      msgPtr,
      sigPtr,
      testData.RECOVER_PARAM
    );
    expect(result).toEqual(testData.SECP256K1_PUBKEY_HEX);
  });
});

describe('query_chain', () => {
  it('fails for missing contract', () => {});
});

describe('db_scan', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('unbound works', () => {
    const idRegionPtr = vm.db_scan(0, 0, Order.Ascending);
    const id = fromRegionPtr(vm, idRegionPtr);
    expect(id).toBe(1);

    let item = vm.do_db_next(id);
    expectEntryToBe(testData.KEY1, testData.VALUE1, item);

    item = vm.do_db_next(id);
    expectEntryToBe(testData.KEY2, testData.VALUE2, item);

    item = vm.do_db_next(id);
    expect(item.ptr).toBe(0);
  });

  it('unbound descending works', () => {
    const idRegionPtr = vm.db_scan(0, 0, Order.Descending);
    const id = fromRegionPtr(vm, idRegionPtr);
    expect(id).toBe(1);

    let item = vm.do_db_next(id);
    expectEntryToBe(testData.KEY2, testData.VALUE2, item);

    item = vm.do_db_next(id);
    expectEntryToBe(testData.KEY1, testData.VALUE1, item);

    item = vm.do_db_next(id);
    expect(item.ptr).toBe(0);
  });

  it('bound works', () => {
    const startRegionPtr = writeData(vm, toAscii('anna')).ptr;
    const endRegionPtr = writeData(vm, toAscii('bert')).ptr;

    const idRegionPtr = vm.db_scan(startRegionPtr, endRegionPtr, Order.Ascending);
    const id = fromRegionPtr(vm, idRegionPtr);
    expect(id).toBe(1);

    let item = vm.do_db_next(id);
    expectEntryToBe(testData.KEY1, testData.VALUE1, item);

    item = vm.do_db_next(id);
    expect(item.ptr).toBe(0);
  });

  it('bound descending works', () => {
    const startRegionPtr = writeData(vm, toAscii('antler')).ptr;
    const endRegionPtr = writeData(vm, toAscii('trespass')).ptr;

    const idRegionPtr = vm.db_scan(startRegionPtr, endRegionPtr, Order.Descending);
    const id = fromRegionPtr(vm, idRegionPtr);
    expect(id).toBe(1);

    let item = vm.do_db_next(id);
    expectEntryToBe(testData.KEY2, testData.VALUE2, item);

    item = vm.do_db_next(id);
    expect(item.ptr).toBe(0);
  });

  it('multiple iterators', () => {
    const idRegionPtr1 = vm.db_scan(0, 0, Order.Ascending);
    const id1 = fromRegionPtr(vm, idRegionPtr1);
    expect(id1).toBe(1);

    const idRegionPtr2 = vm.db_scan(0, 0, Order.Descending);
    const id2 = fromRegionPtr(vm, idRegionPtr2);
    expect(id2).toBe(2);

    expectEntryToBe(testData.KEY1, testData.VALUE1, vm.do_db_next(id1)); // first item, first iterator
    expectEntryToBe(testData.KEY2, testData.VALUE2, vm.do_db_next(id1)); // second item, first iterator
    expectEntryToBe(testData.KEY2, testData.VALUE2, vm.do_db_next(id2)); // first item, second iterator
    expect(vm.do_db_next(id1).ptr).toBe(0);                              // end, first iterator
    expectEntryToBe(testData.KEY1, testData.VALUE1, vm.do_db_next(id2)); // second item, second iterator
  });

  it('fails for invalid order value', () => {
    expect(() => vm.db_scan(0, 0, 42)).toThrow();
  });
});

describe('db_next', () => {
  let vm: VMInstance;
  beforeEach(async () => {
    vm = await createVM();
  });

  it('works', () => {
    const idRegionPtr = vm.db_scan(0, 0, Order.Ascending);
    const id = fromRegionPtr(vm, idRegionPtr);

    let kvRegionPtr = vm.db_next(id);
    expectEntryToBe(testData.KEY1, testData.VALUE1, vm.region(kvRegionPtr));

    kvRegionPtr = vm.db_next(id);
    expectEntryToBe(testData.KEY2, testData.VALUE2, vm.region(kvRegionPtr));

    kvRegionPtr = vm.db_next(id);
    expect(kvRegionPtr).toBe(0);
  });

  it('fails for non existent id', () => {
    try {
      vm.db_next(0);
    } catch (e) {
      expect(e).toEqual(new Error('Iterator 0 not found.'));
    }
  });
});

//////////////////
// test helpers //
//////////////////

function expectEntryToBe(
  expectedKey: Uint8Array,
  expectedValue: Uint8Array,
  actualItem: Region
) {
  const json = JSON.parse(fromAscii(actualItem.data));
  const key = new Uint8Array(Object.values(json.key));
  const value = new Uint8Array(Object.values(json.value));

  expect(key).toStrictEqual(expectedKey);
  expect(value).toStrictEqual(expectedValue);
}

function fromRegionPtr(vm: VMInstance, regionPtr: number): number {
  const region = vm.region(regionPtr);
  return toNumber(region.data);
}
