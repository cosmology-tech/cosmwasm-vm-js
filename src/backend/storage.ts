import { fromBase64, toBase64 } from '@cosmjs/encoding';
import { compare } from '../helpers/byte-array';
import Immutable from 'immutable';
import { MAX_LENGTH_DB_KEY } from '../instance';

export interface IStorage {
  get(key: Uint8Array): Uint8Array | null;

  set(key: Uint8Array, value: Uint8Array): void;

  remove(key: Uint8Array): void;
  
  keys(): Iterable<Uint8Array>;
}

export class Record {
  public key: Uint8Array = Uint8Array.from([]);
  public value: Uint8Array = Uint8Array.from([]);
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
}

export class BasicKVStorage implements IStorage {
  // TODO: Add binary uint / typed Addr maps for cw-storage-plus compatibility
  constructor(public dict: Immutable.Map<string, string> = Immutable.Map()) {}
  
  *keys() {
    for (const key of this.dict.keys()) {
      yield fromBase64(key);
    }
  }

  get(key: Uint8Array): Uint8Array | null {
    const keyStr = toBase64(key);
    const value = this.dict.get(keyStr);
    if (value === undefined) {
      return null;
    }

    return fromBase64(value);
  }

  set(key: Uint8Array, value: Uint8Array): void {
    const keyStr = toBase64(key);
    this.dict = this.dict.set(keyStr, toBase64(value));
  }

  remove(key: Uint8Array): void {
    if (key.length > MAX_LENGTH_DB_KEY) {
      throw new Error(
        `Key length ${key.length} exceeds maximum length ${MAX_LENGTH_DB_KEY}.`
      );
    }
    this.dict = this.dict.remove(toBase64(key));
  }
}

export class BasicKVIterStorage extends BasicKVStorage implements IIterStorage {
  constructor(public iterators: Map<number, Iter> = new Map()) {
    super();
  }

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
    if (!record) {
      return null;
    }

    iter.position += 1;
    return record;
  }

  scan(start: Uint8Array, end: Uint8Array, order: Order): number {
    if (!(order in Order)) {
      throw new Error(`Invalid order value ${order}.`);
    }

    const newId = this.iterators.size + 1;

    // if start > end, this represents an empty range
    if (start.length && end.length && compare(start, end) === 1) {
      this.iterators.set(newId, { data: [], position: 0 });
      return newId;
    }

    let data: Record[] = [];
    for (const key of this.dict.keys()) {
      if (start.length && compare(start, fromBase64(key)) === 1) continue;
      if (end.length && compare(fromBase64(key), end) > -1) break;

      data.push({ key: fromBase64(key), value: this.get(fromBase64(key))! });
    }

    if (order === Order.Descending) {
      data = data.reverse();
    }

    this.iterators.set(newId, { data, position: 0 });
    return newId;
  }
}
