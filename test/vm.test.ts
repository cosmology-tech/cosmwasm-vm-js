import { readFileSync } from 'fs';
import { CosmWasmVM } from '../src';

const wasm_byte_code = readFileSync('./cosmwasm_vm_test.wasm');
const vm = new CosmWasmVM(wasm_byte_code);

const mock_env = {
  block: {
    height: 1337,
    time: '2000000000',
    chain_id: 'columbus-5',
  },
  contract: {
    address: 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76',
  },
};

const mock_info = {
  sender: 'terra1337xewwfv3jdjuz8e0nea9vd8dpugc0k2dcyt3',
  funds: [],
};

describe('CosmWasmVM', () => {
  it('instantiates', () => {
    const chain = vm.instantiate(mock_env, mock_info, { count: 20 });
    console.log(chain.json);
    console.log(vm.store);
  });

  it('execute', () => {
    let chain = vm.instantiate(mock_env, mock_info, { count: 20 });
    chain = vm.execute(mock_env, mock_info, { increment: {} });
    console.log(chain.json);
    console.log(vm.store);
  });
});
