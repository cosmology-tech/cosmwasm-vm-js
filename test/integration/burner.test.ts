import { readFileSync } from 'fs';
import { VMInstance } from "../../src/instance";
import {
  BasicBackendApi,
  BasicKVIterStorage,
  BasicQuerier,
  IBackend,
} from '../../src/backend';
import { Region } from '../../src/memory';

const backend: IBackend = {
  backend_api: new BasicBackendApi('terra'),
  storage: new BasicKVIterStorage(),
  querier: new BasicQuerier(),
};

const verifier = 'terra1kzsrgcktshvqe9p089lqlkadscqwkezy79t8y9';
const beneficiary = 'terra1zdpgj8am5nqqvht927k3etljyl6a52kwqup0je';
const creator = 'terra1337xewwfv3jdjuz8e0nea9vd8dpugc0k2dcyt3';

const mockEnv = {
  block: {
    height: 1337,
    time: '2000000000',
    chain_id: 'columbus-5',
  },
  contract: { address: 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76' }
};

const mockInfo: { sender: string, funds: { amount: string, denom: string }[] } = {
  sender: creator,
  funds: []
};

let vm: VMInstance;
describe('burner', () => {
  beforeEach(async () => {
    vm = new VMInstance(backend);
    await vm.build(readFileSync('testdata/v1.1/burner.wasm'));
  });

  it('instantiate_fails', () => {
    // Act
    const response = vm.instantiate(mockEnv, mockInfo, {});

    // Assert
    expect((response.json as { error: string }).error).toBe('Generic error: You can only use this contract for migrations');
  });

  it('migrate_cleans_up_data', () => {
    // ToDo
  });
});
