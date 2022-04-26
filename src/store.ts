export class KVStore extends Map<string, string> {
  // TODO: Add binary uint / typed Addr maps for cw-storage-plus compatibility
  constructor() {
    super();
    console.log('init KVStore');
  }
}
