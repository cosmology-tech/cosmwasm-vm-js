import { CosmWasmVM } from '../src';
import { readFileSync } from 'fs';

const wasm_byte_code = readFileSync('./cosmwasm_vm_test.wasm');
const vm = new CosmWasmVM(wasm_byte_code);

const mock_env = {
  block: {
    height: 1,
    time: '2000000000',
    chain_id: 'columbus-5',
  },
  contract: {
    address: 'contract',
  },
};

const mock_info = {
  sender: 'sender',
  funds: [],
};

describe('CosmWasmVM', () => {
  it('instantiates', () => {
    let res = vm.instantiate(mock_env, mock_info, { count: 20 });
    console.log(res.json);
    console.log(vm.store);
  });

  it('execute', () => {
    let res = vm.instantiate(mock_env, mock_info, { count: 20 });
    res = vm.execute(mock_env, mock_info, { increment: {} });
    console.log(res.json);
    console.log(vm.store);
  });
});
