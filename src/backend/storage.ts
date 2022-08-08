import { toBase64 } from '@cosmjs/encoding';

export interface IStorage {
  get(key: Uint8Array): Uint8Array | null;

  set(key: Uint8Array, value: Uint8Array): void;

  remove(key: Uint8Array): void;
}

export enum Order {
  Ascending = 1,
  Descending = 2,
}

export interface IIterStorage extends IStorage {
  scan(start: Uint8Array | null, end: Uint8Array | null, order: Order): number; // Uint32
  next(iterator_id: number /* Uint32 */): Record | null;
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
    if (value !== undefined) {
      return Buffer.from(value);
    }
    return null;
  }

  set(key: Uint8Array, value: Uint8Array): void {
    const keyStr = toBase64(key);
    this.dict[keyStr] = toBase64(value);
  }

  remove(key: Uint8Array): void {
    this.dict[toBase64(key)] = undefined;
  }
}
