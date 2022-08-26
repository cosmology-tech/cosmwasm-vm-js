# CosmWasm VM in JavaScript

This package contains an implementation of the CosmWasm VM that is runnable on Node.js and web browsers that support
WebAssembly (currently only tested on V8 browsers like Google Chrome).
This allows you to run `.wasm` binaries intended for CosmWasm without the need for a backend blockchain or Rust
toolchain, enabling new ways to instrument and test CosmWasm smart contracts.

**NOTE:** This package is intended to work with contracts built for CosmWasm v1.0.

**NOTE:** Although great care has been taken to match the behavior of the original CosmWasm VM (powered by Wasmer),
this
implementation may not provide identical results and should not be used as a drop-in replacement. Results obtained
should be verified against the original implementation for critical use-cases.

## Setup

Add the `cosmwasm-vm-js` package as a dependency in your `package.json`.

```sh
npm install -S cosmwasm-vm
```

or

```sh
yarn add cosmwasm-vm-js
```

## Usage

```ts
import { readFileSync } from 'fs';
import { BasicKVIterStorage, VMInstance } from 'cosmwasm-vm-js';
import {
  BasicBackendApi,
  BasicQuerier,
  IBackend,
} from 'cosmwasm-vm-js/backend';

const wasm_byte_code = readFileSync('testdata/cosmwasm_vm_test.wasm');
const backend: IBackend = {
  backend_api: new BasicBackendApi('terra'),
  storage: new BasicKVIterStorage(),
  querier: new BasicQuerier(),
};

const vm = new VMInstance(backend);
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

    const region = vm.instantiate(mock_env, mock_info, { count: 20 });
    console.log(region.json);
    console.log(vm.backend);
    const actual = {
      ok: {
        attributes: [
          { key: 'method', value: 'instantiate' },
          {
            key: 'owner',
            value: 'terra1337xewwfv3jdjuz8e0nea9vd8dpugc0k2dcyt3',
          },
          { key: 'count', value: '20' },
        ],
        data: null,
        events: [],
        messages: [],
      },
    };
    expect(region.json).toEqual(actual);
  });

  it('execute', async () => {
    await vm.build(wasm_byte_code);

    let region = vm.instantiate(mock_env, mock_info, { count: 20 });
    region = vm.execute(mock_env, mock_info, { increment: {} });
    console.log(region.json);
    console.log(vm.backend);
    const actual = {
      ok: {
        attributes: [{ key: 'method', value: 'try_increment' }],
        data: null,
        events: [],
        messages: [],
      },
    };
    expect(region.json).toEqual(actual);
  });
});
```

## How it works

CosmWasm smart contracts are WebAsssembly binaries that export certain function symbols called "entrypoints", such as
the following:

- `instantiate`
- `execute`
- `query`
- `migrate`

Users interact and invoke operations on the smart contract by calling the desired entrypoint with arguments.
As these are exposed as WebAssembly functions, we should normally be able to call them directly.
However, CosmWasm contracts carry some implicit requirements that must be met before we can interact with the contract's
functions naturally.

1. Contracts expect certain symbols to be provided by the VM host (WASM imports).
2. Contracts need an environment with storage to which it can read and write data.
3. Contract entrypoints expect to be called with input arguments prepared and allocated into memory in a certain way.
4. The response of contract entrypoint invocations should be parsed.

`cosmwasm-vm-js` provides a VM implementation that addresses all of these requirements and exposes a simulated execution
environment that can be further customized to enable possibilities such as instrumentation, visualization, debugging,
and more.

## WASM Imports

The following WASM imports have been implemented according to `imports.rs` in `cosmwasm-vm`.

| Import Name                | Implemented?       | Tested?            | Notes                                        |
| -------------------------- |--------------------|--------------------| -------------------------------------------- |
| `db_read`                  | :white_check_mark: | :white_check_mark: |                                              |
| `db_write`                 | :white_check_mark: | :white_check_mark: |                                              |
| `db_remove`                | :white_check_mark: | :white_check_mark: |                                              |
| `db_scan`                  | :x:                | :x:                |                                              |
| `db_next`                  | :white_check_mark: | :x:                |                                              |
| `addr_humanize`            | :white_check_mark: | :white_check_mark: |                                              |
| `addr_canonicalize`        | :white_check_mark: | :white_check_mark: |                                              |
| `addr_validate`            | :white_check_mark: | :white_check_mark: |                                              |
| `secp256k1_verify`         | :white_check_mark: | :white_check_mark: |                                              |
| `secp256k1_recover_pubkey` | :white_check_mark: | :white_check_mark: |                                              |
| `ed25519_verify`           | :white_check_mark: | :white_check_mark: |                                              |
| `ed25519_batch_verify`     | :white_check_mark: | :white_check_mark: |                                              |
| `debug`                    | :white_check_mark: | :x:                | Defers to user-supplied debug functionality. |
| `query_chain`              | :x:                | :x:                |                                              |
| `abort`                    | :white_check_mark: | :x:                |                                              |

## Environment & Storage

We provide a simple key-value store with bytes keys and bytes values in `BasicKVIterStorage`.

### WebAssembly Linear Memory

A loaded CosmWasm contract module's linear memory is accessible as `WebAssembly.Memory`, which can be read as a
bytearray through
JavaScript's `Uint8Array` data type.

### Passing data from JavaScript to WASM

To invoke entrypoint functions, we need to pass in arguments from JavaScript and load them into WebAssembly linear
memory accessible by the contract. Although we can write directly to `WebAssembly.Memory`, doing this is considered
unsafe as we don't know what we might be touching.
Instead, we must use the contract's `allocate` entrypoint which gives us a pointer to a writeable region of linear
memory which is recognized by the WASM code.

`cosmwasm-vm-js` also provides the `Region` class, which is an analog of the `Region` type found in `cosmwasm-vm`.

#### CosmWasm's `Region` type

```rust
/// Describes some data allocated in Wasm's linear memory.
/// A pointer to an instance of this can be returned over FFI boundaries.
///
/// This is the same as `cosmwasm_std::memory::Region`
/// but defined here to allow Wasmer specific implementation.
#[repr(C)]
#[derive(Default, Clone, Copy, Debug)]
struct Region {
    /// The beginning of the region expressed as bytes from the beginning of the linear memory
    pub offset: u32,
    /// The number of bytes available in this region
    pub capacity: u32,
    /// The number of bytes used in this region
    pub length: u32,
}
```

CosmWasm contract entrypoints expect their parameters to be pointers to `Region` structs, which point to the actual data
via `offset`.

```text
arg ---> Region ---> argument data
```

# License

This software is licensed under the [MIT License](https://opensource.org/licenses/MIT).

Copyright &copy; 2022 Terran One LLC
