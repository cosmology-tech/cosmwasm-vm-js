import { Region } from "./memory";

export class CosmWasmVM {
  public instance: WebAssembly.Instance;

  constructor(public wasmByteCode: ArrayBuffer, public store: object = {}) {
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

  public region(ptr: number): Region {
    return new Region(this.exports.memory, ptr);
  }

  protected do_db_read(key: Region): Region {
    return this.allocate_json(this.store[key.str]);
  }

  protected do_db_write(key: Region, value: Region) {
    this.store[key.str] = value.str;
  }

  protected db_remove(key: Region) {}

  protected db_scan(start: Region, end: Region, order: number) {}

  protected db_next(iterator_id: number) {}

  protected addr_humanize(source: Region, destination: Region): Region {}

  protected addr_canonicalize(source: Region, destination: Region): Region {}

  protected addr_validate(source: Region): Region {}

  protected secp256k1_verify(
    hash: Region,
    signature: Region,
    pubkey: Region
  ): Region {}

  protected secp256k1_recover_pubkey(
    hash: Region,
    signature: Region,
    recover_param: number
  ): Region {}

  protected ed25519_verify(
    message: Region,
    signature: Region,
    pubkey: Region
  ): Region {}

  protected ed25519_batch_verify(
    messages: Region,
    signatures: Region,
    public_keys: Region
  ): Region {}

  protected debug(message: Region) {}

  protected query_chain(request: Region): Region {}
}
