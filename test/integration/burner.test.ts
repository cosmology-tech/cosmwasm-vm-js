//////////////////////////////////////////////////////////////////////
// Burner is an example contract for migration (introduced in CW 0.9).
// It cannot be instantiated, but an existing contract can be migrated
// to the Burner to permanently burn the contract and perform basic
// cleanup.
// -----
// Rust Sources: https://github.com/CosmWasm/cosmwasm/tree/main/contracts/burner
import { readFileSync } from 'fs';
import { VMInstance } from "../../src/instance";
import {
  BasicBackendApi,
  BasicKVIterStorage,
  BasicQuerier,
  IBackend,
  Order,
} from '../../src/backend';
import { toAscii } from '@cosmjs/encoding';
import { Env, MessageInfo } from '../../src/types';

class MockQuerier extends BasicQuerier {
  handleQuery(request: any): any {
    return { amount: [{ denom: 'earth', amount: '1000' }] }
  }
}

const wasmBytecode = readFileSync('testdata/v1.1/burner.wasm');
const backend: IBackend = {
  backend_api: new BasicBackendApi('terra'),
  storage: new BasicKVIterStorage(),
  querier: new MockQuerier(),
};

const creator = 'terra1337xewwfv3jdjuz8e0nea9vd8dpugc0k2dcyt3';
const payout = 'terra163u9pnx5sucsk537zpn82fzxjgdp44xehfdy4x';

const mockEnv: Env = {
  block: {
    height: 1337,
    time: '2000000000',
    chain_id: 'columbus-5',
  },
  contract: { address: 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76' }
};

let vm: VMInstance;
describe('burner', () => {
  beforeEach(async () => {
    vm = new VMInstance(backend);
    await vm.build(wasmBytecode);
  });

  // port of https://github.com/CosmWasm/cosmwasm/blob/f6a0485088f1084379a5655bcc2956526290c09f/contracts/burner/tests/integration.rs#L32
  it('instantiate_fails', async () => {
    // Arrange
    const mockInfo: MessageInfo = {
      sender: creator,
      funds: [
        { denom: 'earth', amount: '1000' },
      ],
    }

    // Act
    const instantiateResponse = vm.instantiate(mockEnv, mockInfo, {});

    // Assert
    expect(instantiateResponse.json).toEqual({
      error: 'Generic error: You can only use this contract for migrations',
    });
  });

  // port of https://github.com/CosmWasm/cosmwasm/blob/f6a0485088f1084379a5655bcc2956526290c09f/contracts/burner/tests/integration.rs#L47
  // TODO: querier not yet implemented
  // test verifies two things:
  // 1) remaining coins in storage (123456 gold) are sent to payout address
  // 2) storage is purged
  it('migrate_cleans_up_data', async () => {
    // Arrange
    // TODO: VM instance w/ coin data & Bank module
    // const vm = new VMInstance(backend, [{ denom: 'gold', amount: '123456' }]);
    const storage = vm.backend.storage;

    storage.set(toAscii('foo'), toAscii('bar'));
    storage.set(toAscii('key2'), toAscii('data2'));
    storage.set(toAscii('key3'), toAscii('cool stuff'));

    // TODO: support scan(null, null, Order)
    let iterId = storage.scan(null, null, Order.Ascending);
    let cnt = storage.all(iterId);
    expect(cnt.length).toStrictEqual(3);

    const migrateMsg = { payout };

    // Act
    const res = vm.migrate(mockEnv, migrateMsg).json as any;

    // Assert
    expect(res.ok.messages.length).toStrictEqual(1);
    expect(res.ok.messages[0]).toBeDefined();
    // TODO: msg is SubMsg w/ BankMsg::Send to payout of all coins in contract
    iterId = storage.scan(null, null, Order.Ascending);
    cnt = storage.all(iterId);
    expect(cnt.length).toStrictEqual(0);
  });
});
