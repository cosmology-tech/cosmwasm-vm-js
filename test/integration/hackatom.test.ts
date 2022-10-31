import { readFileSync } from 'fs';
import { VMInstance } from "../../src/instance";
import {
  BasicBackendApi,
  BasicKVIterStorage,
  BasicQuerier,
} from '../../src/backend';
import { fromBase64 } from '@cosmjs/encoding';
import { Region } from '../../src/memory';
import { expectResponseToBeOk, parseBase64Response } from '../common/test-vm';

type HackatomQueryRequest = {
  bank: {
    all_balances: {
      address: string
    }
  }
}
class HackatomMockQuerier extends BasicQuerier {
  private balances: Map<string, { amount: string, denom: string }[]> = new Map();

  update_balance(addr: string, balance: { amount: string; denom: string; }[]): { amount: string; denom: string; }[] {
    this.balances.set(addr, balance);
    return balance;
  }

  handleQuery(queryRequest: HackatomQueryRequest): any {
    if ('bank' in queryRequest) {
      if ('all_balances' in queryRequest.bank) {
        const { address } = queryRequest.bank.all_balances;
        return { amount: this.balances.get(address) || [] }
      }
    }

    throw new Error(`unknown query: ${JSON.stringify(queryRequest)}`);
  }
}

const wasmBytecode = readFileSync('testdata/v1.1/hackatom.wasm');

const verifier = 'terra1kzsrgcktshvqe9p089lqlkadscqwkezy79t8y9';
const beneficiary = 'terra1zdpgj8am5nqqvht927k3etljyl6a52kwqup0je';
const creator = 'terra1337xewwfv3jdjuz8e0nea9vd8dpugc0k2dcyt3';
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
describe('hackatom', () => {
  let querier: HackatomMockQuerier;

  beforeEach(async () => {
    querier = new HackatomMockQuerier();
    vm = new VMInstance({
      backend_api: new BasicBackendApi('terra'),
      storage: new BasicKVIterStorage(),
      querier
    });
    await vm.build(wasmBytecode);
  });


  it('proper_initialization', async () => {
    // Act
    const instantiateResponse = vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Assert
    expect(instantiateResponse.json).toEqual({
      ok: {
        attributes: [
          { key: 'Let the', value: 'hacking begin' },
        ],
        data: null,
        events: [],
        messages: [],
      },
    });
    expectVerifierToBe(verifier);
  });

  it('instantiate_and_query', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Act
    const queryResponse = vm.query(mockEnv, { verifier: {} });

    // Assert
    expectResponseToBeOk(queryResponse);
    expect(parseBase64OkResponse(queryResponse)).toEqual({ verifier });
  });

  it('migrate_verifier', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Act
    const newVerifier = 'terra1h8ljdmae7lx05kjj79c9ekscwsyjd3yr8wyvdn'
    let response = vm.migrate(mockEnv, { verifier: newVerifier });

    // Assert
    expectResponseToBeOk(response);
    expect((response.json as { ok: { messages: any[] }}).ok.messages.length).toBe(0);
    expectVerifierToBe(newVerifier);
  });

  it.skip('sudo_can_steal_tokens', async () => {}); // sudo not implemented

  it('querier_callbacks_work', async () => {
    // Arrange
    const richAddress = 'foobar';
    const richBalance = [{ amount: '10000', denom: 'gold' }];
    querier.update_balance(richAddress, richBalance);

    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Act
    const queryResponse = vm.query(mockEnv, { other_balance: { address: richAddress } });
    const queryResponseWrongAddress = vm.query(mockEnv, { other_balance: { address: 'other address' } });

    // Assert
    expectResponseToBeOk(queryResponse);
    expect(parseBase64OkResponse(queryResponse).amount).toEqual(richBalance);

    expectResponseToBeOk(queryResponseWrongAddress);
    expect(parseBase64OkResponse(queryResponseWrongAddress).amount).toEqual([]);
  });

  it('fails_on_bad_init', async () => {
    // Act
    const response = vm.instantiate(
      mockEnv,
      { funds: [{ amount: '1000', denom: 'earth' }] } as any, // invalid info message, missing sender field
      { verifier, beneficiary });

    // Assert
    expect((response.json as { error: string }).error.indexOf('Error parsing')).toBe(0);
  });

  it('execute_release_works', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });
    querier.update_balance(mockContractAddr, [{ amount: '1000', denom: 'earth' }]);

    // Act
    const execResponse = vm.execute(
      mockEnv,
      { sender: verifier, funds: [] },
      { release: {} });

    // Assert
    expectResponseToBeOk(execResponse);

    expect((execResponse.json as any).ok.messages.length).toBe(1);
    expect((execResponse.json as any).ok.messages[0].msg.bank.send.to_address).toBe(beneficiary);
    expect((execResponse.json as any).ok.messages[0].msg.bank.send.amount).toStrictEqual([{ amount: '1000', denom: 'earth' }]);

    expect((execResponse.json as any).ok.attributes[0]).toStrictEqual({key: 'action', value: 'release'});
    expect((execResponse.json as any).ok.attributes[1]).toStrictEqual({key: 'destination', value: beneficiary});

    expect(fromBase64((execResponse.json as any).ok.data)[0]).toBe(240); // 0xF0
    expect(fromBase64((execResponse.json as any).ok.data)[1]).toBe(11);  // 0x0B
    expect(fromBase64((execResponse.json as any).ok.data)[2]).toBe(170); // 0xAA
  });

  it('execute_release_fails_for_wrong_sender', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });
    querier.update_balance(mockContractAddr, [{ amount: '1000', denom: 'earth' }]);

    // Act
    const execResponse = vm.execute(
      mockEnv,
      { sender: beneficiary, funds: [] },
      { release: {} });

    // Assert
    expect((execResponse.json as any).error).toBe('Unauthorized');
  });

  it('execute_panic', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Act
    expect(() => vm.execute(mockEnv, mockInfo, { panic: {} })).toThrow();
  });

  it('execute_user_errors_in_api_calls', async () => {
    // Arrange
    vm.instantiate(mockEnv, mockInfo, { verifier, beneficiary });

    // Act
    expect(() => vm.execute(mockEnv, mockInfo, { user_errors_in_api_calls: {} })).toThrow();
  });
});

// Helpers

function expectVerifierToBe(addr: string) {
  const queryResponse = vm.query(mockEnv, { verifier: {} });
  const verifier = parseBase64OkResponse(queryResponse);
  expect(verifier).toEqual({ verifier: addr });
}

function parseBase64OkResponse(region: Region): any {
  const data = (region.json as { ok: string }).ok;
  if (!data) {
    throw new Error(`Response indicates an error state: ${JSON.stringify(region.json)}`)
  }

  return parseBase64Response(data);
}
