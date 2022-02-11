function db_read(key_ptr: number): number {
  let key = this.region(key_ptr);
  this.do_db_read(key);
}

function db_write(key_ptr: number, value_ptr: number) {}

function db_remove() {}

function db_scan() {}

function db_next() {}

function addr_humanize() {}

function addr_canonicalize() {}

function addr_validate() {}

function secp256k1_recover_pubkey() {}

function ed25519_verify() {}

function ed25519_batch_verify() {}

function debug() {}

function query_chain() {}
