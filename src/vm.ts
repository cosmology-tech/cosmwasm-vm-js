/*eslint-disable prefer-const */
/*eslint-disable no-unused-vars*/
import { bech32, BechLib } from 'bech32';
import { Region } from './memory';
import { KVStore } from './store';

export class CosmWasmVM {
  public instance: WebAssembly.Instance;
  public store: KVStore;
  public bech32: BechLib;

  constructor(public wasmByteCode: ArrayBuffer, store?: KVStore) {
    if (store === undefined) {
      store = new KVStore();
    }
    this.store = store;
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
      },
    };

    this.instance = new WebAssembly.Instance(
      new WebAssembly.Module(wasmByteCode),
      imports
    );

    this.bech32 = bech32;
  }

  protected get exports(): any {
    return this.instance.exports;
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
    return this.do_secp256k1_verify(hash, signature, pubkey).ptr;
  }

  secp256k1_recover_pubkey(
    hash_ptr: number,
    signature_ptr: number,
    recover_param: number
  ): Region {
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
    return this.do_ed25519_verify(message, signature, pubkey).ptr;
  }

  ed25519_batch_verify(
    messages_ptr: number,
    signatures_ptr: number,
    public_keys_ptr: number
  ): number {
    let messages = this.region(messages_ptr);
    let signatures = this.region(signatures_ptr);
    let public_keys = this.region(public_keys_ptr);
    return this.do_ed25519_batch_verify(messages, signatures, public_keys).ptr;
  }

  debug(message_ptr: number) {
    let message = this.region(message_ptr);
    this.do_debug(message);
  }

  query_chain(request_ptr: number): number {
    let request = this.region(request_ptr);
    return this.do_query_chain(request).ptr;
  }

  public region(ptr: number): Region {
    return new Region(this.exports.memory, ptr);
  }

  protected do_db_read(key: Region): Region {
    let value = this.store.get(key.b64);
    let result: Region;
    if (value === undefined) {
      console.log(`db_read: key not found: ${key.str}`);
      result = this.allocate_bytes(Uint8Array.from([0]));
    } else {
      console.log(`db_read: key found: ${key.str}`);
      result = this.allocate_b64(value);
    }
    console.log(`db_read: ${key.str} => ${result.str}`);
    return result;
  }

  protected do_db_write(key: Region, value: Region) {
    console.log(`db_write ${key.str} => ${value.str}`);
    this.store.set(key.b64, value.b64);
  }

  protected do_db_remove(key: Region) {
    this.store.delete(key.b64);
  }

  protected do_db_scan(start: Region, end: Region, order: number): Region {
    throw new Error('not implemented');
  }

  protected do_db_next(iterator_id: number): Region {
    throw new Error('not implemented');
  }

  protected do_addr_humanize(source: Region, destination: Region): Region {
    throw new Error('not implemented');
  }

  protected do_addr_canonicalize(source: Region, destination: Region): Region {
    const canonical = this.bech32.fromWords(
      this.bech32.decode(source.str).words
    );
    destination = this.allocate_bytes(Buffer.from(canonical));
    return new Region(this.exports.memory, 0);
  }

  protected do_addr_validate(source: Region): Region {
    // TODO: do real check - bypass here is to simply return a zero pointer
    return new Region(this.exports.memory, 0);
  }

  protected do_secp256k1_verify(
    hash: Region,
    signature: Region,
    pubkey: Region
  ): Region {
    throw new Error('not implemented');
  }

  protected do_secp256k1_recover_pubkey(
    hash: Region,
    signature: Region,
    recover_param: number
  ): Region {
    throw new Error('not implemented');
  }

  protected do_ed25519_verify(
    message: Region,
    signature: Region,
    pubkey: Region
  ): Region {
    throw new Error('not implemented');
  }

  protected do_ed25519_batch_verify(
    messages: Region,
    signatures: Region,
    public_keys: Region
  ): Region {
    throw new Error('not implemented');
  }

  protected do_debug(message: Region) {
    console.log(message.read_str());
  }

  protected do_query_chain(request: Region): Region {
    throw new Error('not implemented');
  }
}
