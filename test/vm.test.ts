import { readFileSync } from 'fs';
import { CosmWasmVM } from '../src';

const wasm_byte_code = readFileSync('./cosmwasm_vm_test.wasm');
const vm = new CosmWasmVM();

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
  it('instantiates', async () => {
    await vm.build(wasm_byte_code);

    const chain = vm.instantiate(mock_env, mock_info, { count: 20 });
    console.log(chain.json);
    console.log(vm.store);
  });

  it('execute', async () => {
    await vm.build(wasm_byte_code);

    let chain = vm.instantiate(mock_env, mock_info, { count: 20 });
    chain = vm.execute(mock_env, mock_info, { increment: {} });
    console.log(chain.json);
    console.log(vm.store);
  });

  it('abort', () => {
    try {
      vm.abort(4, 8, 16, 32);
    } catch (e) {
      expect(e).toEqual(new Error('abort:  at :16:32'));
    }
  });

  it('addr_canonicalize', () => {
    const number = vm.addr_canonicalize(
      0,
      vm.allocate_json({
        address: 'terra1hsk6jryyqjfhp5dhc55tc9jtckygx0eph6dd02',
      }).ptr,
    );
    console.log(number);
    console.log(vm.store);
  });
});
