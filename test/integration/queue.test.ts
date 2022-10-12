import { readFileSync } from 'fs';
import { VMInstance } from "../../src/instance";
import {
  BasicBackendApi,
  BasicKVIterStorage,
  BasicQuerier,
  IBackend,
} from '../../src/backend';
import { Region } from '../../src/memory';
import { expectResponseToBeOk, parseBase64Response } from '../common/test-vm';

const wasmBytecode = readFileSync('testdata/v1.1/queue.wasm');
const backend: IBackend = {
  backend_api: new BasicBackendApi('terra'),
  storage: new BasicKVIterStorage(),
  querier: new BasicQuerier(),
};

const creator = 'creator';
const mockContractAddr = 'cosmos2contract';

const mockEnv = {
  block: {
    height: 12345,
    time: '1571797419879305533',
    chain_id: 'cosmos-testnet-14002',
  },
  contract: { address: mockContractAddr }
};

const mockInfo: { sender: string, funds: { amount: string, denom: string }[] } = {
  sender: creator,
  funds: []
};

let vm: VMInstance;
describe('queue', () => {
  beforeEach(async () => {
    vm = new VMInstance(backend, 100_000_000_000_000) // TODO: implement gas limit on VM
    await vm.build(wasmBytecode);
  });

  it.only('instantiate_and_query', async () => {
    // Arrange
    const instantiateResponse = vm.instantiate(mockEnv, mockInfo, {});
    expect((instantiateResponse.json as any).ok.messages.length).toBe(0);

    // Act
    const countResponse = vm.query(mockEnv, { count: {} });
    const sumResponse = vm.query(mockEnv, { sum: {} });

    // Assert
    expectResponseToBeOk(countResponse);
    expect(parseBase64OkResponse(countResponse)).toEqual({ count: 0 });

    expectResponseToBeOk(sumResponse);
    expect(parseBase64OkResponse(sumResponse)).toEqual({ sum: 0 });
  });
});

// Helpers

function parseBase64OkResponse(region: Region): any {
  const data = (region.json as { ok: string }).ok;
  if (!data) {
    throw new Error(`Response indicates an error state: ${JSON.stringify(region.json)}`)
  }

  return parseBase64Response(data);
}
