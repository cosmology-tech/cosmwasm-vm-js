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

export const SECP256K1_MESSAGE_HEX = fromHex('5c868fedb8026979ebd26f1ba07c27eedf4ff6d10443505a96ecaf21ba8c4f0937b3cd23ffdc3dd429d4cd1905fb8dbcceeff1350020e18b58d2ba70887baa3a9b783ad30d3fbf210331cdd7df8d77defa398cdacdfc2e359c7ba4cae46bb74401deb417f8b912a1aa966aeeba9c39c7dd22479ae2b30719dca2f2206c5eb4b7');
export const ETHEREUM_MESSAGE = 'connect all the things';
export const ETHEREUM_SIGNATURE_HEX = fromHex('dada130255a447ecf434a2df9193e6fbba663e4546c35c075cd6eea21d8c7cb1714b9b65a4f7f604ff6aad55fba73f8c36514a512bbbba03709b37069194f8a41b');
export const ETHEREUM_SIGNER_ADDRESS = '0x12890D2cce102216644c59daE5baed380d84830c';
export const ED25519_MESSAGE_HEX = fromHex('af82');
export const ED25519_SIGNATURE_HEX = fromHex('6291d657deec24024827e69c3abe01a30ce548a284743a445e3680d7db5ac3ac18ff9b538d16f290ae67f760984dc6594a7c15e9716ed28dc027beceea1ec40a');
export const ED25519_PUBLIC_KEY_HEX = fromHex('fc51cd8e6218a1a38da47ed00230f0580816ed13ba3303ac5deb911548908025');
export const ED25519_MESSAGE2_HEX = fromHex('72');
export const ED25519_SIGNATURE2_HEX = fromHex('92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00');
export const ED25519_PUBLIC_KEY2_HEX = fromHex('3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c');

