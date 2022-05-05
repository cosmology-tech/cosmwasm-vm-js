# Run CosmWasm in JavaScript

**THIS IS STILL UNDER DEVELOPMENT! Contributions are welcome.**

**NOTE:** This was built for Terra-specific applications and thus is only supported for CosmWasm v0.16. However, this implementation probably can be easily adapted to support CosmWasm v1.0+.

This package implements a pure JavaScript (no Rust bindings / WASM needed) VM capable of executing compiled CosmWasm .wasm binaries in environments such as Node.js and compatible web browsers.

## Setup

Add the `cosmwasm-vm` package as a dependency in your `package.json`.

```sh
npm install -S cosmwasm-vm
```

or

```sh
yarn add cosmwasm-vm
```

## Usage

Please refer to the test in this repository for an example. I include a test contract based on `cosmwasm/cw-template` that has been augmented with additional `ExecuteMsg` variants for testing the various WASM imports.

```sh
yarn
yarn test
```

```ts
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
```
