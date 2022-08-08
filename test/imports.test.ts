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

describe('do_db_write', () => {
  it('works', () => {});
  it('can override', () => {});
  it('works for empty value', () => {});
  it('is prohibited in readonly contexts', () => {});
});

describe('do_db_remove', () => {
  it('works', () => {});
  it('is prohibited in readonly contexts', () => {});
});

describe('do_addr_validate', () => {
  it('works', () => {});
});

describe('do_addr_canonicalize', () => {
  it('works', () => {});
});

describe('do_addr_humanize', () => {
  it('works', () => {});
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
