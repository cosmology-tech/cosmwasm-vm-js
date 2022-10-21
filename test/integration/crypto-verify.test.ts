import { readFileSync } from 'fs';
import { VMInstance } from "../../src/instance";
import { BasicBackendApi, BasicKVIterStorage, BasicQuerier, IBackend, } from '../../src/backend';
import * as testData from '../common/test-data';
import { parseBase64Response, wrapResult } from "../common/test-vm";
import { fromHex, toHex } from "@cosmjs/encoding";

const wasmBytecode = readFileSync('testdata/v1.1/crypto_verify.wasm');

const creator = 'creator';
const mockContractAddr = '0x12890D2cce102216644c59daE5baed380d84830c';

const mockEnv = {
  block: {
    height: 12345,
    time: '1571797419879305533',
    chain_id: 'cosmos-testnet-14002',
  },
  contract: {address: mockContractAddr}
};

const mockInfo: { sender: string, funds: { amount: string, denom: string }[] } = {
  sender: creator,
  funds: []
};

let vm: VMInstance;

export function convertHexToBase64(hex: Uint8Array): string {
  return Buffer.from(toHex(hex), 'hex').toString('base64');
}

export function convertStringToBase64(str: string): string {
  return Buffer.from(str, "binary").toString('base64');
}

describe('crypto-verify', () => {
  beforeEach(async () => {
    const backend: IBackend = {
      backend_api: new BasicBackendApi('terra'),
      storage: new BasicKVIterStorage(),
      querier: new BasicQuerier(),
    };

    vm = new VMInstance(backend);
    await vm.build(wasmBytecode);
  });

  it('instantiate_works', async () => {
    const instantiateResponse = vm.instantiate(mockEnv, mockInfo, {});

    expect(instantiateResponse.json).toEqual({
      ok: {
        attributes: [],
        data: null,
        events: [],
        messages: [],
      },
    });
  });

  it('cosmos_signature_verify_works', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verify_msg = {
      verify_cosmos_signature: {
        message: convertHexToBase64(testData.SECP256K1_MESSAGE_HEX),
        signature: convertHexToBase64(testData.ECDSA_SIG_HEX),
        public_key: convertHexToBase64(testData.ECDSA_PUBKEY_HEX),
      }
    };
    const raw = wrapResult(vm.query(mockEnv, verify_msg)).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: true,
    });
  });

  it('cosmos_signature_verify_fails', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const message = testData.SECP256K1_MESSAGE_HEX;
    message[0] ^= 0x01;
    const verify_msg = {
      verify_cosmos_signature: {
        message: convertHexToBase64(message),
        signature: convertHexToBase64(testData.ECDSA_SIG_HEX),
        public_key: convertHexToBase64(testData.ECDSA_PUBKEY_HEX),
      }
    };
    const raw = wrapResult(vm.query(mockEnv, verify_msg)).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: false,
    });
  });

  it('cosmos_signature_verify_errors', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verify_msg = {
      verify_cosmos_signature: {
        message: convertHexToBase64(testData.SECP256K1_MESSAGE_HEX),
        signature: convertHexToBase64(testData.ECDSA_SIG_HEX),
        public_key: convertHexToBase64(new Uint8Array(0)),
      }
    };

    try {
      vm.query(mockEnv, verify_msg)
    } catch (e: any) {
      expect(e.message).toEqual('Expected public key to be an Uint8Array with length [33, 65]');
    }
  });

  it('ethereum_signature_verify_works', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verify_msg = {
      verify_ethereum_text: {
        message: convertStringToBase64(testData.ETHEREUM_MESSAGE),
        signature: convertHexToBase64(testData.ETHEREUM_SIGNATURE_HEX),
        signer_address: testData.ETHEREUM_SIGNER_ADDRESS,
      }
    };
    const raw = wrapResult(vm.query(mockEnv, verify_msg)).unwrap();
    const res = parseBase64Response(raw);
    // TODO: Still failing
    expect(res).toEqual({
      verifies: true,
    });
  });

  it('ethereum_signature_verify_fails_for_corrupted_message', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const message = testData.ETHEREUM_MESSAGE + '!';
    const verify_msg = {
      verify_ethereum_text: {
        message: convertStringToBase64(message),
        signature: convertHexToBase64(testData.ETHEREUM_SIGNATURE_HEX),
        signer_address: testData.ETHEREUM_SIGNER_ADDRESS,
      }
    };
    const raw = wrapResult(vm.query(mockEnv, verify_msg)).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: false,
    });
  });

  it('ethereum_signature_verify_fails_for_corrupted_signature', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    // Wrong signature
    const signature = testData.ETHEREUM_SIGNATURE_HEX;
    signature[5] ^= 0x01;
    const verify_msg = {
      verify_ethereum_text: {
        message: convertStringToBase64(testData.ETHEREUM_MESSAGE),
        signature: convertHexToBase64(signature),
        signer_address: testData.ETHEREUM_SIGNER_ADDRESS,
      }
    };
    const raw = wrapResult(vm.query(mockEnv, verify_msg)).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: false,
    });

    // broken signature
    const signature2 = new Uint8Array(65).fill(0x1c);
    const verify_msg2 = {
      verify_ethereum_text: {
        message: convertStringToBase64(testData.ETHEREUM_MESSAGE),
        signature: convertHexToBase64(signature2),
        signer_address: testData.ETHEREUM_SIGNER_ADDRESS,
      }
    };
    try {
      vm.query(mockEnv, verify_msg2);
    } catch (e: any) {
      expect(e.message).toEqual('Public key could not be recover');
    }
  });

  it('verify_ethereum_transaction_works', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const nonce = 225;
    const chain_id = 4;
    const from = '0x0a65766695a712af41b5cfecaad217b1a11cb22a';
    const to = '0xe137f5264b6b528244e1643a2d570b37660b7f14';
    const gas_limit = '141000';
    const gas_price = '1000000000';
    const value = '5445500';
    const data = Buffer.from([83, 101, 97, 114, 99, 104, 32, 116, 120, 32, 116, 101, 115, 116, 32, 48, 46, 54, 53, 57, 48, 56, 54, 57, 49, 55, 51, 57, 54, 52, 51, 51, 53]).toString('base64');
    const r = Buffer.from([185, 41, 157, 171, 80, 179, 205, 220, 174, 205, 100, 178, 155, 251, 213, 205, 48, 250, 193, 161, 173, 234, 27, 53, 154, 19, 196, 229, 23, 20, 146, 166]).toString('base64');
    const s = Buffer.from([87, 48, 89, 198, 109, 137, 70, 132, 72, 143, 146, 231, 206, 31, 145, 177, 88, 202, 87, 176, 35, 84, 133, 98, 91, 87, 106, 59, 152, 196, 128, 172]).toString('base64');
    const v = 43;

    const msg = {
      verify_ethereum_transaction: {
        from: from,
        to: to,
        nonce: nonce,
        gas_price: gas_price,
        gas_limit: gas_limit,
        value: value,
        data: data,
        chain_id: chain_id,
        r: r,
        s: s,
        v: v,
      }
    };

    const raw = wrapResult(vm.query(mockEnv, msg)).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: true,
    });
  });

  it('tendermint_signature_verify_works', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verify_msg = {
      verify_tendermint_signature: {
        message: convertHexToBase64(testData.ED25519_MESSAGE_HEX),
        signature: convertHexToBase64(testData.ED25519_SIGNATURE_HEX),
        public_key: convertHexToBase64(testData.ED25519_PUBLIC_KEY_HEX),
      }
    };

    const raw = wrapResult(vm.query(mockEnv, verify_msg)).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: true,
    });
  });

  it('tendermint_signature_verify_fails', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const message = testData.ED25519_MESSAGE_HEX;
    message[0] ^= 0x01;

    const verify_msg = {
      verify_tendermint_signature: {
        message: convertHexToBase64(message),
        signature: convertHexToBase64(testData.ED25519_SIGNATURE_HEX),
        public_key: convertHexToBase64(testData.ED25519_PUBLIC_KEY_HEX),
      }
    };

    const raw = wrapResult(vm.query(mockEnv, verify_msg)).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: false,
    });
  });

  it('tendermint_signature_verify_errors', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verify_msg = {
      verify_tendermint_signature: {
        message: convertHexToBase64(testData.ED25519_MESSAGE_HEX),
        signature: convertHexToBase64(testData.ED25519_SIGNATURE_HEX),
        public_key: convertHexToBase64(new Uint8Array(0)),
      }
    };

    const raw = wrapResult(vm.query(mockEnv, verify_msg)).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: false,
    });
  });

  it('tendermint_signatures_batch_verify_works', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verifyMsg = {
      verify_tendermint_batch: {
        messages: [
          convertHexToBase64(testData.ED25519_MESSAGE_HEX),
          convertHexToBase64(testData.ED25519_MESSAGE2_HEX),
        ],
        signatures: [
          convertHexToBase64(testData.ED25519_SIGNATURE_HEX),
          convertHexToBase64(testData.ED25519_SIGNATURE2_HEX),
        ],
        public_keys: [
          convertHexToBase64(testData.ED25519_PUBLIC_KEY_HEX),
          convertHexToBase64(testData.ED25519_PUBLIC_KEY2_HEX),
        ],
      }
    };

    const queryResult = vm.query(mockEnv, verifyMsg);
    expect((queryResult.json as any).error).not.toBeDefined();

    const raw = wrapResult(queryResult).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: true,
    });
  });

  it('tendermint_signatures_batch_verify_message_multisig_works', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verifyMsg = {
      verify_tendermint_batch: {
        messages: [
          convertHexToBase64(testData.ED25519_MESSAGE_HEX),
        ],
        signatures: [
          convertHexToBase64(testData.ED25519_SIGNATURE_HEX),
          convertHexToBase64(testData.ED25519_SIGNATURE_HEX),
        ],
        public_keys: [
          convertHexToBase64(testData.ED25519_PUBLIC_KEY_HEX),
          convertHexToBase64(testData.ED25519_PUBLIC_KEY_HEX),
        ],
      }
    };

    const queryResult = vm.query(mockEnv, verifyMsg);
    expect((queryResult.json as any).error).not.toBeDefined();

    const raw = wrapResult(queryResult).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: true,
    });
  });

  it('tendermint_signatures_batch_verify_single_public_key_works', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verifyMsg = {
      verify_tendermint_batch: {
        messages: [
          convertHexToBase64(testData.ED25519_MESSAGE_HEX),
          convertHexToBase64(testData.ED25519_MESSAGE_HEX),
        ],
        signatures: [
          convertHexToBase64(testData.ED25519_SIGNATURE_HEX),
          convertHexToBase64(testData.ED25519_SIGNATURE_HEX),
        ],
        public_keys: [
          convertHexToBase64(testData.ED25519_PUBLIC_KEY_HEX),
        ],
      }
    };

    const queryResult = vm.query(mockEnv, verifyMsg);
    expect((queryResult.json as any).error).not.toBeDefined();

    const raw = wrapResult(queryResult).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: true,
    });
  });

  it('tendermint_signatures_batch_verify_fails', async () => {
    vm.instantiate(mockEnv, mockInfo, {});
    const messages = [
      testData.ED25519_MESSAGE_HEX,
      testData.ED25519_MESSAGE2_HEX,
    ];
    messages[1][0] ^= 0x01;

    const verifyMsg = {
      verify_tendermint_batch: {
        messages: messages.map(m => convertHexToBase64(m)),
        signatures: [
          convertHexToBase64(testData.ED25519_SIGNATURE_HEX),
          convertHexToBase64(testData.ED25519_SIGNATURE2_HEX),
        ],
        public_keys: [
          convertHexToBase64(testData.ED25519_PUBLIC_KEY_HEX),
          convertHexToBase64(testData.ED25519_PUBLIC_KEY2_HEX),
        ],
      }
    };

    const queryResult = vm.query(mockEnv, verifyMsg);
    expect((queryResult.json as any).error).not.toBeDefined();

    const raw = wrapResult(queryResult).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: false,
    });
  });

  it('tendermint_signatures_batch_verify_errors', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verifyMsg = {
      verify_tendermint_batch: {
        messages: [
          convertHexToBase64(testData.ED25519_MESSAGE_HEX),
          convertHexToBase64(testData.ED25519_MESSAGE2_HEX),
        ],
        signatures: [
          convertHexToBase64(testData.ED25519_SIGNATURE_HEX),
          convertHexToBase64(testData.ED25519_SIGNATURE2_HEX),
        ],
        public_keys: [
          convertHexToBase64(testData.ED25519_PUBLIC_KEY_HEX),
          convertHexToBase64(fromHex(""))
        ],
      }
    };

    const queryResult = vm.query(mockEnv, verifyMsg);
    expect((queryResult.json as any).error).not.toBeDefined();

    const raw = wrapResult(queryResult).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: false,
    });
  });

  it('query_works', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const raw = wrapResult(vm.query(mockEnv, {list_verification_schemes: {}})).unwrap();
    const result = parseBase64Response(raw);
    expect(result).toEqual({
      verification_schemes: [
        "secp256k1",
        "ed25519",
        "ed25519_batch",
      ]
    });
  });
});
