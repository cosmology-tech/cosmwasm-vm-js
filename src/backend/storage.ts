import { fromBase64, toBase64 } from '@cosmjs/encoding';
import { MAX_LENGTH_DB_KEY } from '../instance';

export interface IStorage {
  get(key: Uint8Array): Uint8Array | null;

  set(key: Uint8Array, value: Uint8Array): void;

  remove(key: Uint8Array): void;

  clear(): void;
}

export interface Iter {
  data: Array<Record>;
  position: number;
}

export enum Order {
  Ascending = 1,
  Descending = 2,
}

export interface IIterStorage {
  get(key: Uint8Array): Uint8Array | null;

  set(key: Uint8Array, value: Uint8Array): void;

  remove(key: Uint8Array): void;

  all(iterator_id: number): Array<Record>;

  scan(start: Uint8Array | null, end: Uint8Array | null, order: Order): number; // Uint32
  next(iterator_id: number /* Uint32 */): Record | null;

  clear(): void;
}

export class BasicKVIterStorage implements IIterStorage {
  constructor(
    public data: Map<Uint8Array, Uint8Array> = new Map(),
    public iterators: Map<number, Iter> = new Map()
  ) {}

  all(iterator_id: number): Array<Record> {
    const out: Array<Record> = [];
    let condition = true;
    while (condition) {
      const record = this.next(iterator_id);
      if (record === null) {
        condition = false;
      } else {
        out.push(record);
      }
    }
    return out;
  }

  get(key: Uint8Array): Uint8Array | null {
    const value = this.data.get(key);
    if (value === undefined) {
      return null;
    }
    return value;
  }

  // Get next element of iterator with ID `iterator_id`.
  // Creates a region containing both key and value and returns its address.
  // Ownership of the result region is transferred to the contract.
  // The KV region uses the format value || key || keylen, where keylen is a fixed size big endian u32 value.
  // An empty key (i.e. KV region ends with \0\0\0\0) means no more element, no matter what the value is.
  next(iterator_id: number): Record | null {
    const iter = this.iterators.get(iterator_id);
    if (iter === undefined) {
      throw new Error(`Iterator ${iterator_id} not found.`);
    }
    const record = iter.data[iter.position];
    iter.position += 1;
    return record;
  }

  remove(key: Uint8Array): void {
    if (key.length > MAX_LENGTH_DB_KEY) {
      throw new Error(
        `Key length ${key.length} exceeds maximum length ${MAX_LENGTH_DB_KEY}.`
      );
    }
    this.data.delete(key);
  }

  // Creates an iterator that will go from start to end.
  // If start_ptr == 0, the start is unbounded.
  // If end_ptr == 0, the end is unbounded.
  // Order is defined in cosmwasm_std::Order and may be 1 (ascending) or 2 (descending). All other values result in an error.
  // Ownership of both start and end pointer is not transferred to the host.
  // Returns an iterator ID.
  scan(start: Uint8Array | null, end: Uint8Array | null, order: Order): number {
    throw new Error('Not implemented');
  }

  set(key: Uint8Array, value: Uint8Array): void {
    this.data.set(key, value);
  }

  clear(): void {
    this.data.clear();
  }
}

export class Record {
  public key: Uint8Array = Uint8Array.from([]);
  public value: Uint8Array = Uint8Array.from([]);
}

export class BasicKVStorage implements IStorage {
  // TODO: Add binary uint / typed Addr maps for cw-storage-plus compatibility
  constructor(public dict: { [key: string]: string | undefined } = {}) {}

  get(key: Uint8Array): Uint8Array | null {
    const keyStr = toBase64(key);
    const value = this.dict[keyStr];
    if (value === undefined) {
      return null;
    }

    return fromBase64(value);
  }

  set(key: Uint8Array, value: Uint8Array): void {
    const keyStr = toBase64(key);
    this.dict[keyStr] = toBase64(value);
  }

  remove(key: Uint8Array): void {
    if (key.length > MAX_LENGTH_DB_KEY) {
      throw new Error(
        `Key length ${key.length} exceeds maximum length ${MAX_LENGTH_DB_KEY}.`
      );
    }
    this.dict[toBase64(key)] = undefined;
  }

  clear() {
    Object.keys(this.dict).forEach((key) => {
      delete this.dict[key];
    });
  }
}
