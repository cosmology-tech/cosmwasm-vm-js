import { readFileSync } from 'fs';
import { VMInstance, IBackend, BasicBackendApi, BasicKVIterStorage, BasicQuerier, Region } from "../../src";
import { KEY1, VALUE1, KEY2, VALUE2 } from './test-data';

export const createVM = async (): Promise<VMInstance> => {
  const wasmByteCode = readFileSync('./testdata/hackatom.wasm');
  const backend: IBackend = {
    backend_api: new BasicBackendApi('terra'),
    storage: new BasicKVIterStorage(),
    querier: new BasicQuerier(),
  };

  const vm = new VMInstance(backend);
  vm.backend.storage.set(KEY1, VALUE1);
  vm.backend.storage.set(KEY2, VALUE2);

  await vm.build(wasmByteCode);
  return vm;
};

export const writeData = (vm: VMInstance, data: Uint8Array): Region => {
  return vm.allocate_bytes(data);
};

export const writeObject = (vm: VMInstance, data: [Uint8Array]): Region => {
  return vm.allocate_json(data);
};
