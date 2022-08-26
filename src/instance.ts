/*eslint-disable prefer-const */
import { bech32, BechLib } from 'bech32';
import { Region } from './memory';
import { ecdsaRecover, ecdsaVerify } from 'secp256k1';
import { eddsa } from 'elliptic';
import { IBackend } from './backend';

export const MAX_LENGTH_DB_KEY: number = 64 * 1024;
export const MAX_LENGTH_DB_VALUE: number = 128 * 1024;
export const MAX_LENGTH_CANONICAL_ADDRESS: number = 64;
export const MAX_LENGTH_HUMAN_ADDRESS: number = 256;

export class VMInstance {
  public PREFIX: string = 'terra';
  public instance?: WebAssembly.Instance;
  public backend: IBackend;
  public bech32: BechLib;
  public eddsa: eddsa;

  constructor(backend: IBackend) {
    this.backend = backend;
    this.bech32 = bech32;
    this.eddsa = new eddsa('ed25519');
  }

  public async build(wasmByteCode: ArrayBuffer) {
    let imports = {
      env: {
        db_read: this.db_read.bind(this),
        db_write: this.db_write.bind(this),
        db_remove: this.db_remove.bind(this),
        db_scan: this.db_scan.bind(this),
        db_next: this.db_next.bind(this),
        addr_humanize: this.addr_humanize.bind(this),
        addr_canonicalize: this.addr_canonicalize.bind(this),
        addr_validate: this.addr_validate.bind(this),
        secp256k1_verify: this.secp256k1_verify.bind(this),
        secp256k1_recover_pubkey: this.secp256k1_recover_pubkey.bind(this),
        ed25519_verify: this.ed25519_verify.bind(this),
        ed25519_batch_verify: this.ed25519_batch_verify.bind(this),
        debug: this.debug.bind(this),
        query_chain: this.query_chain.bind(this),
        abort: this.abort.bind(this),
      },
    };

    const result = await WebAssembly.instantiate(wasmByteCode, imports);
    this.instance = result.instance;
  }

  protected get exports(): any {
    if (!this.instance)
      throw new Error('Please init instance before using methods');
    return this.instance!.exports;
  }

  public allocate(size: number): Region {
    let { allocate, memory } = this.exports;
    let reg_ptr = allocate(size);
    return new Region(memory, reg_ptr);
  }

  public deallocate(region: Region): void {
    let { deallocate } = this.exports;
    deallocate(region.ptr);
  }

  public allocate_bytes(bytes: Uint8Array): Region {
    let region = this.allocate(bytes.length);
    region.write(bytes);
    return region;
  }

  public allocate_b64(b64: string): Region {
    let bytes = Buffer.from(b64, 'base64');
    return this.allocate_bytes(bytes);
  }

  public allocate_str(str: string): Region {
    let region = this.allocate(str.length);
    region.write_str(str);
    return region;
  }

  public allocate_json(obj: object): Region {
    let region = this.allocate(JSON.stringify(obj).length);
    region.write_json(obj);
    return region;
  }

  public instantiate(env: object, info: object, msg: object): Region {
    let { instantiate } = this.exports;
    let args = [env, info, msg].map((x) => this.allocate_json(x).ptr);
    let result = instantiate(...args);
    return this.region(result);
  }

  public execute(env: object, info: object, msg: object): Region {
    let { execute } = this.exports;
    let args = [env, info, msg].map((x) => this.allocate_json(x).ptr);
    let result = execute(...args);
    return this.region(result);
  }

  public query(info: object, msg: object): Region {
    let { query } = this.exports;
    let args = [info, msg].map((x) => this.allocate_json(x).ptr);
    let result = query(...args);
    return this.region(result);
  }

  public migrate(env: object, info: object, msg: object): Region {
    let { migrate } = this.exports;
    let args = [env, info, msg].map((x) => this.allocate_json(x).ptr);
    let result = migrate(...args);
    return this.region(result);
  }

  db_read(key_ptr: number): number {
    let key = this.region(key_ptr);
    return this.do_db_read(key).ptr;
  }

  db_write(key_ptr: number, value_ptr: number) {
    let key = this.region(key_ptr);
    let value = this.region(value_ptr);
    this.do_db_write(key, value);
  }

  db_remove(key_ptr: number) {
    let key = this.region(key_ptr);
    this.do_db_remove(key);
  }

  db_scan(start_ptr: number, end_ptr: number, order: number): number {
    let start = this.region(start_ptr);
    let end = this.region(end_ptr);
    return this.do_db_scan(start, end, order).ptr;
  }

  db_next(iterator_id: number): number {
    return this.do_db_next(iterator_id).ptr;
  }

  addr_canonicalize(source_ptr: number, destination_ptr: number): number {
    let source = this.region(source_ptr);
    let destination = this.region(destination_ptr);
    return this.do_addr_canonicalize(source, destination).ptr;
  }

  addr_humanize(source_ptr: number, destination_ptr: number): number {
    let source = this.region(source_ptr);
    let destination = this.region(destination_ptr);
    return this.do_addr_humanize(source, destination).ptr;
  }

  addr_validate(source_ptr: number): number {
    let source = this.region(source_ptr);
    return this.do_addr_validate(source).ptr;
  }

  secp256k1_verify(
    hash_ptr: number,
    signature_ptr: number,
    pubkey_ptr: number
  ): number {
    let hash = this.region(hash_ptr);
    let signature = this.region(signature_ptr);
    let pubkey = this.region(pubkey_ptr);
    return this.do_secp256k1_verify(hash, signature, pubkey);
  }

  secp256k1_recover_pubkey(
    hash_ptr: number,
    signature_ptr: number,
    recover_param: number
  ): Uint8Array {
    let hash = this.region(hash_ptr);
    let signature = this.region(signature_ptr);
    return this.do_secp256k1_recover_pubkey(hash, signature, recover_param);
  }

  ed25519_verify(
    message_ptr: number,
    signature_ptr: number,
    pubkey_ptr: number
  ): number {
    let message = this.region(message_ptr);
    let signature = this.region(signature_ptr);
    let pubkey = this.region(pubkey_ptr);
    return this.do_ed25519_verify(message, signature, pubkey);
  }

  ed25519_batch_verify(
    messages_ptr: number,
    signatures_ptr: number,
    public_keys_ptr: number
  ): number {
    let messages = this.region(messages_ptr);
    let signatures = this.region(signatures_ptr);
    let public_keys = this.region(public_keys_ptr);
    return this.do_ed25519_batch_verify(messages, signatures, public_keys);
  }

  debug(message_ptr: number) {
    let message = this.region(message_ptr);
    this.do_debug(message);
  }

  query_chain(request_ptr: number): number {
    let request = this.region(request_ptr);
    return this.do_query_chain(request).ptr;
  }

  abort(message_ptr: number, file_ptr: number, line: number, column: number) {
    let message = this.region(message_ptr);
    let file = this.region(file_ptr);
    this.do_abort(message, file, line, column);
  }

  public region(ptr: number): Region {
    return new Region(this.exports.memory, ptr);
  }

  do_db_read(key: Region): Region {
    let value = this.backend.storage.get(key.data);
    let result: Region;

    if (key.str.length > MAX_LENGTH_DB_KEY) {
      throw new Error(
        `Key length ${key.str.length} exceeds maximum length ${MAX_LENGTH_DB_KEY}`
      );
    }

    if (value === null) {
      console.log(`db_read: key not found: ${key.str}`);
      result = this.region(0);
    } else {
      result = this.allocate_bytes(value);
    }
    return result;
  }

  do_db_write(key: Region, value: Region) {
    if (value.str.length > MAX_LENGTH_DB_VALUE) {
      throw new Error(`db_write: value too large: ${value.str}`);
    }

    // throw error for large keys
    if (key.str.length > MAX_LENGTH_DB_KEY) {
      throw new Error(`db_write: key too large: ${key.str}`);
    }

    this.backend.storage.set(key.data, value.data);
  }

  do_db_remove(key: Region) {
    this.backend.storage.remove(key.data);
  }

  do_db_scan(start: Region, end: Region, order: number): Region {
    throw new Error('not implemented');
  }

  do_db_next(iterator_id: number): Region {
    this.backend.storage.next(iterator_id);
    return new Region(this.exports.memory, 0);
  }

  do_addr_humanize(source: Region, destination: Region): Region {
    if (source.str.length === 0) {
      throw new Error('Empty address.');
    }

    let result = this.backend.backend_api.human_address(source.data);

    destination.write_str(result);

    // TODO: add error handling; -- 0 = success, anything else is a pointer to an error message
    return new Region(this.exports.memory, 0);
  }

  do_addr_canonicalize(source: Region, destination: Region): Region {
    let source_data = source.str;

    if (source_data.length === 0) {
      throw new Error('Empty address.');
    }

    let result = this.backend.backend_api.canonical_address(source_data);

    destination.write(result);

    return new Region(this.exports.memory, 0);
  }

  do_addr_validate(source: Region): Region {
    if (source.str.length === 0) {
      throw new Error('Empty address.');
    }

    if (source.str.length > MAX_LENGTH_HUMAN_ADDRESS) {
      throw new Error(`Address too large: ${source.str}`);
    }

    const canonical = this.bech32.fromWords(
      this.bech32.decode(source.str).words
    );

    if (canonical.length === 0) {
      throw new Error('Invalid address.');
    }

    // TODO: Change prefix to be configurable per environment
    const human = this.bech32.encode(
      this.PREFIX,
      this.bech32.toWords(canonical)
    );
    if (human !== source.str) {
      throw new Error('Invalid address.');
    }
    return new Region(this.exports.memory, 0);
  }

  // Verifies message hashes against a signature with a public key, using the secp256k1 ECDSA parametrization.
  // Returns 0 on verification success, 1 on verification failure
  do_secp256k1_verify(hash: Region, signature: Region, pubkey: Region): number {
    console.log(
      `signature length: ${signature.str.length}, pubkey length: ${pubkey.str.length}, message length: ${hash.str.length}`
    );
    const isValidSignature = ecdsaVerify(
      signature.data,
      hash.data,
      pubkey.data
    );

    if (isValidSignature) {
      return 0;
    } else {
      return 1;
    }
  }

  do_secp256k1_recover_pubkey(
    hash: Region,
    signature: Region,
    recover_param: number
  ): Uint8Array {
    return ecdsaRecover(signature.data, recover_param, hash.data, false);
  }

  // Verifies a message against a signature with a public key, using the ed25519 EdDSA scheme.
  // Returns 0 on verification success, 1 on verification failure
  do_ed25519_verify(
    message: Region,
    signature: Region,
    pubkey: Region
  ): number {
    const sig = Buffer.from(signature.data).toString('hex');
    const pub = Buffer.from(pubkey.data).toString('hex');
    const msg = Buffer.from(message.data).toString('hex');
    const _signature = this.eddsa.makeSignature(sig);
    const _pubkey = this.eddsa.keyFromPublic(pub);

    const isValidSignature = this.eddsa.verify(msg, _signature, _pubkey);

    if (isValidSignature) {
      return 0;
    } else {
      return 1;
    }
  }

  // Verifies a batch of messages against a batch of signatures with a batch of public keys,
  // using the ed25519 EdDSA scheme.
  // Returns 0 on verification success (all batches verify correctly), 1 on verification failure
  do_ed25519_batch_verify(
    messages: Region,
    signatures: Region,
    public_keys: Region
  ): number {
    const messages_data = JSON.parse(messages.str);
    const signature_data = JSON.parse(signatures.str);
    const pubKey_data = JSON.parse(public_keys.str);
    if (
      messages_data.length !== signature_data.length ||
      messages_data.length !== pubKey_data.length
    ) {
      throw new Error(
        'Lengths of messages, signatures and public keys do not match.'
      );
    }

    for (let i = 0; i < messages_data.length; i++) {
      const msg = Uint8Array.from(Object.values(messages_data[i]));
      const sig = Uint8Array.from(Object.values(signature_data[i]));
      const pub = Uint8Array.from(Object.values(pubKey_data[i]));
      const _sig = Buffer.from(sig).toString('hex');
      const _pub = Buffer.from(pub).toString('hex');
      const _msg = Buffer.from(msg).toString('hex');
      const _signature = this.eddsa.makeSignature(_sig);
      const _pubkey = this.eddsa.keyFromPublic(_pub);

      const isValidSignature = this.eddsa.verify(_msg, _signature, _pubkey);

      if (!isValidSignature) {
        return 1;
      }
    }
    return 0;
  }

  do_debug(message: Region) {
    console.log(message.read_str());
  }

  do_query_chain(request: Region): Region {
    throw new Error('not implemented');
  }

  do_abort(message: Region, file: Region, line: number, column: number) {
    throw new Error(
      `abort: ${message.read_str()} at ${file.read_str()}:${line}:${column}`
    );
  }
}
