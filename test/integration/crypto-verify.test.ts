import { readFileSync } from 'fs';
import { VMInstance } from "../../src/instance";
import { BasicBackendApi, BasicKVIterStorage, BasicQuerier, IBackend, } from '../../src/backend';

const wasmBytecode = readFileSync('testdata/v1.1/crypto_verify.wasm');
const backend: IBackend = {
  backend_api: new BasicBackendApi('terra'),
  storage: new BasicKVIterStorage(),
  querier: new BasicQuerier(),
};

let vm: VMInstance;

describe('crypto-verify', () => {
  beforeEach(async () => {
    vm = new VMInstance(backend);
    await vm.build(wasmBytecode);
  });
});
