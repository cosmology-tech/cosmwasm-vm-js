/**
 * Wrapper class for the Region data structure, which describes a region of
 * WebAssembly's linear memory that has been allocated by the VM.
 *
 * Note that this class is passed a pointer to the data structure, and the
 * Region's members (offset: u32, capacity: u32, length: u32) are read from
 * that pointer as they are laid out in the data structure.
 */
export class Region {
  /**
   * The region's data structure laid out in memory.
   */
  public region_info: Uint32Array;

  /**
   * @param memory The WebAssembly.Memory object that this region is associated
   * @param ptr The offset of the region's data structure in memory
   */
  constructor(public memory: WebAssembly.Memory, public ptr: number) {
    this.region_info = new Uint32Array(memory.buffer, ptr, 3);
  }

  public get offset(): number {
    return this.region_info[0];
  }

  public set offset(val: number) {
    this.region_info[0] = val;
  }

  public set capacity(val: number) {
    this.region_info[1] = val;
  }

  public get capacity(): number {
    return this.region_info[1];
  }

  public set length(val: number) {
    this.region_info[2] = val;
  }

  public get length(): number {
    return this.region_info[2];
  }

  /**
   * Get a byte-slice of the region's data.
   */
  public get data(): Uint8Array {
    return this.read();
  }

  /**
   * Get a byte-slice of the entire writable region.
   */
  public get slice(): Uint8Array {
    return new Uint8Array(this.memory.buffer, this.offset, this.capacity);
  }

  /**
   * Get a base64-encoded string of the region's data.
   */
  public get b64(): string {
    return this.read_b64();
  }

  /**
   * Get a string view of the region's data.
   */
  public get str(): string {
    return this.read_str();
  }

  /**
   * Parse the object of the region's data as JSON.
   */
  public get json(): object {
    return this.read_json();
  }

  /**
   * Write a byte-slice to the region.
   * @param bytes The bytes to write to the region
   */
  public write(bytes: Uint8Array): void {
    this.slice.set(bytes);
    this.length = bytes.length;
  }

  /**
   * Write bytes encoded as base64 to the region.
   * @param b64 bytes encoded as base64
   */
  public write_b64(b64: string): void {
    this.write(Buffer.from(b64, 'base64'));
  }

  /**
   * Write a string to the region.
   * @param str The string to write to the region
   */
  public write_str(str: string): void {
    this.write(new TextEncoder().encode(str));
  }

  /**
   * Write a JSON object to the region as a string.
   * @param obj The object to write to the region
   */
  public write_json(obj: object): void {
    this.write_str(JSON.stringify(obj));
  }

  /**
   * Reads the region's data as a Uint8Array.
   * @returns The byte-slice of the region's data.
   */
  public read(): Uint8Array {
    return new Uint8Array(this.memory.buffer, this.offset, this.length);
  }

  public read_b64(): string {
    return Buffer.from(this.read()).toString('base64');
  }

  /**
   * Reads the region's data as a String.
   * @returns The region's data as a string.
   */
  public read_str(): string {
    return new TextDecoder().decode(this.read());
  }

  /**
   * Parse the region's data as JSON.
   * @returns The region's data as a JSON object.
   */
  public read_json(): object {
    return JSON.parse(this.read_str());
  }
}
