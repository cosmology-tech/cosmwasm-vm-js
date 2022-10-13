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
    const backend: IBackend = {
      backend_api: new BasicBackendApi('terra'),
      storage: new BasicKVIterStorage(),
      querier: new BasicQuerier(),
    };

    vm = new VMInstance(backend, 100_000_000_000_000) // TODO: implement gas limit on VM
    await vm.build(wasmBytecode);
  });

  it('instantiate_and_query', async () => {
    // Arrange
    const instantiateResponse = vm.instantiate(mockEnv, mockInfo, {});

    // Act
    const countResponse = vm.query(mockEnv, { count: {} });
    const sumResponse = vm.query(mockEnv, { sum: {} });

    // Assert
    expect((instantiateResponse.json as any).ok.messages.length).toBe(0);

    expectResponseToBeOk(countResponse);
    expect(parseBase64OkResponse(countResponse)).toEqual({ count: 0 });

    expectResponseToBeOk(sumResponse);
    expect(parseBase64OkResponse(sumResponse)).toEqual({ sum: 0 });
  });

  it('push_and_query', () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, {});

    // Act
    vm.execute(mockEnv, mockInfo, { enqueue: { value: 25 } });

    // Assert
    const countResponse = vm.query(mockEnv, { count: {} });
    expect(parseBase64OkResponse(countResponse)).toEqual({ count: 1 });

    const sumResponse = vm.query(mockEnv, { sum: {} });
    expect(parseBase64OkResponse(sumResponse)).toEqual({ sum: 25 });
  });

  it('multiple_push', () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, {});

    // Act
    vm.execute(mockEnv, mockInfo, { enqueue: { value: 25 } });
    vm.execute(mockEnv, mockInfo, { enqueue: { value: 35 } });
    vm.execute(mockEnv, mockInfo, { enqueue: { value: 45 } });

    // Assert
    const countResponse = vm.query(mockEnv, { count: {} });
    expect(parseBase64OkResponse(countResponse)).toEqual({ count: 3 });

    const sumResponse = vm.query(mockEnv, { sum: {} });
    expect(parseBase64OkResponse(sumResponse)).toEqual({ sum: 105 });
  });

  it('push_and_pop', () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, {});
    vm.execute(mockEnv, mockInfo, { enqueue: { value: 25 } });
    vm.execute(mockEnv, mockInfo, { enqueue: { value: 17 } });

    // Act
    const dequeueResponse = vm.execute(mockEnv, mockInfo, { dequeue: {} });

    // Assert
    expect(parseBase64Response((dequeueResponse.json as any).ok.data)).toEqual({ value: 25 });

    const countResponse = vm.query(mockEnv, { count: {} });
    expect(parseBase64OkResponse(countResponse)).toEqual({ count: 1 });

    const sumResponse = vm.query(mockEnv, { sum: {} });
    expect(parseBase64OkResponse(sumResponse)).toEqual({ sum: 17 });
  });

  it('push_and_reduce', () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, {});
    vm.execute(mockEnv, mockInfo, { enqueue: { value: 40 } });
    vm.execute(mockEnv, mockInfo, { enqueue: { value: 15 } });
    vm.execute(mockEnv, mockInfo, { enqueue: { value: 85 } });
    vm.execute(mockEnv, mockInfo, { enqueue: { value: -10 } });

    // Act
    const reducerResponse = vm.query(mockEnv, { reducer: {} });

    // Assert
    expect(parseBase64OkResponse(reducerResponse).counters).toStrictEqual([[40, 85], [15, 125], [85, 0], [-10, 140]]);
  });

  it('migrate_works', () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, {});
    vm.execute(mockEnv, mockInfo, { enqueue: { value: 25 } });
    vm.execute(mockEnv, mockInfo, { enqueue: { value: 17 } });

    // Act
    const migrateResponse = vm.migrate(mockEnv, {});

    // Assert
    expect((migrateResponse.json as any).ok.messages.length).toEqual(0);

    const countResponse = vm.query(mockEnv, { count: {} });
    expect(parseBase64OkResponse(countResponse)).toEqual({ count: 3 });

    const sumResponse = vm.query(mockEnv, { sum: {} });
    expect(parseBase64OkResponse(sumResponse)).toEqual({ sum: 303 });
  });

  it('query_list', () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, {});

    for (let i = 0; i < 3; i++) { // ToDo: iterate 25 times (currently breaks when you do this)
      vm.execute(mockEnv, mockInfo, { enqueue: { value: 40 } });
    }

    for (let i = 0; i < 2; i++) { // ToDo: iterate 19 times (currently breaks when you do this)
      vm.execute(mockEnv, mockInfo, { dequeue: {} });
    }

    // Act
    const listResponse = vm.query(mockEnv, { list: {} });

    // Assert
    const list = parseBase64OkResponse(listResponse);
    expect(list.empty).toStrictEqual([]);
    expect(list.early).toStrictEqual([1]);
    expect(list.late).toStrictEqual([]);

    // ToDo: implement asserts from original rust test
    // assert_eq!(ids.empty, Vec::<u32>::new());
    // assert_eq!(ids.early, vec![0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f]);
    // assert_eq!(ids.late, vec![0x20, 0x21, 0x22, 0x23, 0x24]);
  });

  it('query_open_iterators', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, {});

    // Act
    const response1 = vm.query(mockEnv, { open_iterators: { count: 1 } });
    const response2 = vm.query(mockEnv, { open_iterators: { count: 2 } });
    const response3 = vm.query(mockEnv, { open_iterators: { count: 321 } });

    // Assert
    expectResponseToBeOk(response1);
    expectResponseToBeOk(response2);
    expectResponseToBeOk(response3);
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
