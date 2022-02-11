import { CosmWasmVM } from './vm';
import { readFileSync } from 'fs';
const wasm_byte_code = readFileSync(__dirname + '/../test_contract.wasm');

let vm = new CosmWasmVM(wasm_byte_code);
let res = vm.instantiate(
  {
    block: {
      height: 1,
      time: '2000000000',
      chain_id: 'columbus-5',
    },
    contract: {
      address: 'terra12',
    },
  },
  { sender: 'terra11', funds: [] },
  { count: 20 }
);
console.log(vm.store);
