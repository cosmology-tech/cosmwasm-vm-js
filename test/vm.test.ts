import { readFileSync } from 'fs';
import { VMInstance } from '../src';
import { IBackend, BasicKVStorage } from '../src';
import { bech32 } from 'bech32';
import { toBase64 } from '@cosmjs/encoding';
import { eddsa as EDDSA } from 'elliptic';

const wasm_byte_code = readFileSync('testdata/cosmwasm_vm_test.wasm');
const backend: IBackend = {
  backend_api: BasicBackendApi(),
  storage: new BasicKVStorage(),
  querier: new BasicQuerier(),
};
const vm = new VMInstance(backend);


/* Constants from https://github.com/cosmwasm/cosmwasm/blob/5e04c3c1aa7e278626196de43aa18e9bedbc6000/packages/vm/src/imports.rs#L499 */
const KEY1 = 'ant';
const VALUE1 = 'insect';
const KEY2 = 'tree';
const VALUE2 = 'plant';

const INIT_ADDR = 'someone';
const INIT_AMOUNT = 500;
const INIT_DENOM = 'TOKEN';

const ECDSA_HASH_KEY =
  '5ae8317d34d1e595e3fa7247db80c0af4320cce1116de187f8f7e2e099c0d8d0';
const ECDSA_SIG_HEX =
  '207082eb2c3dfa0b454e0906051270ba4074ac93760ba9e7110cd9471475111151eb0dbbc9920e72146fb564f99d039802bf6ef2561446eb126ef364d21ee9c4';
const ECDSA_PUBKEY_HEX =
  '04051c1ee2190ecfb174bfe4f90763f2b4ff7517b70a2aec1876ebcfd644c4633fb03f3cfbd94b1f376e34592d9d41ccaf640bb751b00a1fadeb0c01157769eb73';

const EDDSA_MSG_HEX = '';
const EDDSA_SIG_HEX =
  'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b';

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

    const chain = vm.instantiate(mock_env, mock_info, { count: 20 });
    console.log(chain.json);
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
    expect(chain.json).toEqual(actual);
    // expect(vm.store.size).toEqual(2);
  });

  it('execute', async () => {
    await vm.build(wasm_byte_code);

    let chain = vm.instantiate(mock_env, mock_info, { count: 20 });
    chain = vm.execute(mock_env, mock_info, { increment: {} });
    console.log(chain.json);
    console.log(vm.backend);
    const expected = {
      ok: {
        attributes: [{ key: 'method', value: 'try_increment' }],
        data: null,
        events: [],
        messages: [],
      },
    };
    expect(chain.json).toEqual(expected);
    // expect(vm.store.size).toEqual(2);
  });

  // it('do_db_read should read a valid key', () => {
  //   const key = new Uint8Array([1, 2, 3, 4, 5]);
  //   const value = Uint8Array.from(
  //     Buffer.from('1234567890abcdef1234567890abcdef1234567890abcdef', 'ascii')
  //   );
  //   vm.store.set(key, value);
  //   const result = vm.db_read(vm.allocate_b64(key).ptr);
  //   expect(result).not.toEqual(null);
  // });
  //
  // it('db_write should write key and value', () => {
  //   const key = toBase64(new Uint8Array([1, 2, 3, 4, 5]));
  //   const value = '1234567890abcdef1234567890abcdef1234567890abcdef';
  //   vm.db_write(vm.allocate_b64(key).ptr, vm.allocate_str(value).ptr);
  //   const allocatePtr = vm.allocate_b64(key).ptr;
  //   expect(allocatePtr).toEqual(vm.region(allocatePtr).ptr);
  // });
  //
  // it('abort', () => {
  //   try {
  //     vm.abort(4, 8, 16, 32);
  //   } catch (e) {
  //     expect(e).toEqual(new Error('abort:  at :16:32'));
  //   }
  // });
  //
  // it('addr_canonicalize', () => {
  //   const cosmosAddr = bech32.encode(
  //     'cosmos1',
  //     bech32.toWords(
  //       Buffer.from('1234567890abcdef1234567890abcdef12345678', 'hex')
  //     )
  //   );
  //   const region = vm.allocate_str(cosmosAddr);
  //   const number = vm.addr_canonicalize(
  //     region.ptr,
  //     vm.allocate_json({
  //       address: cosmosAddr,
  //     }).ptr
  //   );
  //   console.log(number);
  //   console.log(vm.store);
  //   expect(number).toEqual(0);
  // });
  //
  // it('addr_humanize', () => {
  //   const cosmosAddr = bech32.encode(
  //     'cosmos1',
  //     bech32.toWords(
  //       Buffer.from('1234567890abcdef1234567890abcdef12345678', 'hex')
  //     )
  //   );
  //   const region = vm.allocate_str(cosmosAddr);
  //   const number = vm.addr_humanize(
  //     region.ptr,
  //     vm.allocate_json({
  //       address: cosmosAddr,
  //     }).ptr
  //   );
  //   console.log(number);
  //   console.log(vm.store);
  //   expect(number).toEqual(0);
  // });
  //
  // it('should addr_validate valid address', () => {
  //   const cosmosAddr = bech32.encode(
  //     'cosmos1',
  //     bech32.toWords(
  //       Buffer.from('1234567890abcdef1234567890abcdef12345678', 'hex')
  //     )
  //   );
  //   const region = vm.allocate_str(cosmosAddr);
  //   const number = vm.addr_validate(region.ptr);
  //   console.log(number);
  //   console.log(vm.store);
  //   expect(number).toEqual(0);
  // });
  //
  // it('addr_validate should throw error for invalid address', () => {
  //   try {
  //     const region = vm.allocate_str(
  //       'cosmos11zg69v7ys40x77y352eufp27daufrg4nchuhe2ng'
  //     );
  //     vm.addr_validate(region.ptr);
  //   } catch (e) {
  //     expect(e).toEqual(
  //       new Error(
  //         'Invalid checksum for cosmos11zg69v7ys40x77y352eufp27daufrg4nchuhe2ng'
  //       )
  //     );
  //   }
  // });
  //
  // it('addr_validate should throws error for too long address', () => {
  //   try {
  //     const region = vm.allocate_str(
  //       'cosmos11zg69v7ys40x77y352eufp27daufrg4nchuhe2ngdafsadfsafasdfasfasfsadfsadfsafsafdasfsadfsadf'
  //     );
  //     vm.addr_validate(region.ptr);
  //   } catch (e) {
  //     expect(e).toEqual(new Error('Exceeds length limit'));
  //   }
  // });
  //
  // it('addr_validate should throws error for empty address', () => {
  //   try {
  //     const region = vm.allocate_str('');
  //     vm.addr_validate(region.ptr);
  //   } catch (e) {
  //     expect(e).toEqual(new Error('Empty address.'));
  //   }
  // });
  //
  // it('ed25519_verify', () => {
  //   const ec = new EDDSA('ed25519');
  //   const key = ec.keyFromSecret('1234567890abcdef1234567890abcdef12345678');
  //   const msgHash = Buffer.from('Terra to the moon and beyond!', 'utf8');
  //   const signature = key.sign(msgHash);
  //   const isValidKey = key.verify(msgHash, signature) ? 1 : 0;
  //
  //   const pubKeyRegion = vm.allocate_bytes(key.getPublic());
  //   const sigRegion = vm.allocate_bytes(signature.toBytes());
  //   const messageRegion = vm.allocate_bytes(msgHash);
  //   const result = vm.ed25519_verify(
  //     messageRegion.ptr,
  //     sigRegion.ptr,
  //     pubKeyRegion.ptr
  //   );
  //   expect(vm.region(result).read().at(0)).toEqual(isValidKey);
  // });
});
