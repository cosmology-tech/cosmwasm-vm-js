import { fromHex, toAscii } from '@cosmjs/encoding';

// Constants from https://github.com/cosmwasm/cosmwasm/blob/5e04c3c1aa7e278626196de43aa18e9bedbc6000/packages/vm/src/imports.rs#L499

// In Rust, b"XXX" is the same as creating a bytestring of the ASCII-encoded string "XXX".
export const KEY1 = toAscii('ant');
export const VALUE1 = toAscii('insect');
export const KEY2 = toAscii('tree');
export const VALUE2 = toAscii('plant');

export const ECDSA_HASH_HEX = fromHex(
  '5ae8317d34d1e595e3fa7247db80c0af4320cce1116de187f8f7e2e099c0d8d0'
);
export const ECDSA_SIG_HEX = fromHex(
  '207082eb2c3dfa0b454e0906051270ba4074ac93760ba9e7110cd9471475111151eb0dbbc9920e72146fb564f99d039802bf6ef2561446eb126ef364d21ee9c4'
);
export const ECDSA_PUBKEY_HEX = fromHex(
  '04051c1ee2190ecfb174bfe4f90763f2b4ff7517b70a2aec1876ebcfd644c4633fb03f3cfbd94b1f376e34592d9d41ccaf640bb751b00a1fadeb0c01157769eb73'
);

export const EDDSA_MSG_HEX = fromHex('');
export const EDDSA_SIG_HEX = fromHex(
  'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b'
);
export const EDDSA_PUBKEY_HEX = fromHex(
  'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'
);

export const SECP256K1_MSG_HEX = fromHex(
  '5ae8317d34d1e595e3fa7247db80c0af4320cce1116de187f8f7e2e099c0d8d0'
);
export const SECP256K1_SIG_HEX = fromHex(
  '45c0b7f8c09a9e1f1cea0c25785594427b6bf8f9f878a8af0b1abbb48e16d0920d8becd0c220f67c51217eecfd7184ef0732481c843857e6bc7fc095c4f6b788'
);
export const RECOVER_PARAM = 1;
export const SECP256K1_PUBKEY_HEX = fromHex(
  '044a071e8a6e10aada2b8cf39fa3b5fb3400b04e99ea8ae64ceea1a977dbeaf5d5f8c8fbd10b71ab14cd561f7df8eb6da50f8a8d81ba564342244d26d1d4211595'
);

export const ED25519_MSG_HEX = fromHex('72');
export const ED25519_SIG_HEX = fromHex(
  '92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00'
);
export const ED25519_PUBKEY_HEX = fromHex(
  '3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c'
);
