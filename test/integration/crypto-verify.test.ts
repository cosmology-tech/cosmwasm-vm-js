import { readFileSync } from 'fs';
import { VMInstance } from "../../src/instance";
import { BasicBackendApi, BasicKVIterStorage, BasicQuerier, IBackend, } from '../../src/backend';
import * as testData from '../common/test-data';
import { expectResponseToBeOk, parseBase64Response, wrapResult } from "../common/test-vm";
import { fromHex, toHex } from "@cosmjs/encoding";

const wasmBytecode = readFileSync('testdata/v1.1/crypto_verify.wasm');
const backend: IBackend = {
  backend_api: new BasicBackendApi('terra'),
  storage: new BasicKVIterStorage(),
  querier: new BasicQuerier(),
};

const creator = 'creator';
const mockContractAddr = 'cosmos2contract';

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
        message: testData.ETHEREUM_MESSAGE,
        signature: convertHexToBase64(testData.ETHEREUM_SIGNATURE_HEX),
        signer_address: testData.ETHEREUM_SIGNER_ADDRESS,
      }
    };
    const raw = vm.query(mockEnv, verify_msg);
    console.log(raw.json);
  });

  it('ethereum_signature_verify_fails_for_corrupted_message', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const message = testData.ETHEREUM_MESSAGE;
    const verify_msg = {
      verify_ethereum_text: {
        message: message,
        signature: testData.ETHEREUM_SIGNATURE_HEX,
        public_key: testData.ETHEREUM_SIGNER_ADDRESS,
      }
    };
    const raw = vm.query(mockEnv, verify_msg);
    expectResponseToBeOk(raw);
  });

  it('ethereum_signature_verify_fails_for_corrupted_signature', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    // Wrong signature
    const signature = testData.ETHEREUM_SIGNATURE_HEX;
    signature[5] ^= 0x01;
    const verify_msg = {
      verify_ethereum_text: {
        message: testData.ETHEREUM_MESSAGE,
        signature: signature,
        public_key: testData.ETHEREUM_SIGNER_ADDRESS,
      }
    };
    const raw = vm.query(mockEnv, verify_msg);
    expectResponseToBeOk(raw);

    // broken signature
    const signature2 = new Uint8Array(65).fill(0x1c);
    const verify_msg2 = {
      verify_ethereum_signature: {
        message: testData.ETHEREUM_MESSAGE,
        signature: signature2,
        public_key: testData.ETHEREUM_SIGNER_ADDRESS,
      }
    };
    const raw2 = vm.query(mockEnv, verify_msg2);
    expectResponseToBeOk(raw2);
  });

  it('verify_ethereum_transaction_works', async () => {
    vm.instantiate(mockEnv, mockInfo, {});
    const nonce = 0xe1;
    const chain_id = 4;
    const from = '0x0a65766695a712af41b5cfecaad217b1a11cb22a';
    const to = '0xe137f5264b6b528244e1643a2d570b37660b7f14';
    const gas_limit = new Uint8Array(1).fill(0x226c8);
    const gas_price = new Uint8Array(1).fill(0x3b9aca00);
    const value = new Uint8Array(1).fill(0x53177c);
    const data = fromHex('536561726368207478207465737420302e36353930383639313733393634333335');
    const r = fromHex('b9299dab50b3cddcaecd64b29bfbd5cd30fac1a1adea1b359a13c4e5171492a6');
    const s = fromHex('573059c66d894684488f92e7ce1f91b158ca57b0235485625b576a3b98c480ac');
    const v = 0x2b;

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

    const raw = vm.query(mockEnv, msg);
    expectResponseToBeOk(raw);
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

    const verify_msg = {
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

    const raw = wrapResult(vm.query(mockEnv, verify_msg)).unwrap();
    const res = parseBase64Response(raw);
    expect(res).toEqual({
      verifies: false,
    });
  });

  it('tendermint_signatures_batch_verify_message_multisig_works', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verify_msg = {
      verify_tenmdermint_batch: {
        messages: [
          testData.ED25519_MESSAGE_HEX,
        ],
        signatures: [
          testData.ED25519_SIGNATURE_HEX,
          testData.ED25519_SIGNATURE_HEX,
        ],
        public_keys: [
          testData.ED25519_PUBLIC_KEY_HEX,
          testData.ED25519_PUBLIC_KEY_HEX,
        ],
      }
    };

    const raw = vm.query(mockEnv, verify_msg);
  });

  it('tendermint_signatures_batch_verify_single_public_key_works', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verify_msg = {
      verify_tenmdermint_batch: {
        messages: [
          testData.ED25519_MESSAGE_HEX,
          testData.ED25519_MESSAGE_HEX,
        ],
        signatures: [
          testData.ED25519_SIGNATURE_HEX,
          testData.ED25519_SIGNATURE_HEX,
        ],
        public_keys: [
          testData.ED25519_PUBLIC_KEY_HEX,
        ],
      }
    };

    const raw = vm.query(mockEnv, verify_msg);
  });

  it('tendermint_signatures_batch_verify_fails', async () => {
    vm.instantiate(mockEnv, mockInfo, {});
    const messages = [
      testData.ED25519_MESSAGE_HEX,
      testData.ED25519_MESSAGE2_HEX,
    ];

    messages[1][0] ^= 0x01;
    const verify_msg = {
      verify_tenmdermint_batch: {
        messages: messages,
        signatures: [
          testData.ED25519_SIGNATURE_HEX,
          testData.ED25519_SIGNATURE2_HEX,
        ],
        public_keys: [
          testData.ED25519_PUBLIC_KEY_HEX,
          testData.ED25519_PUBLIC_KEY2_HEX,
        ],
      }
    };

    const raw = vm.query(mockEnv, verify_msg);
  });

  it('tendermint_signatures_batch_verify_errors', async () => {
    vm.instantiate(mockEnv, mockInfo, {});

    const verify_msg = {
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

    const raw = vm.query(mockEnv, verify_msg);
    console.log(raw);
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
