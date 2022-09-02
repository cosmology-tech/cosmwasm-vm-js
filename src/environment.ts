import { IBackendApi, IIterStorage, IQuerier, IStorage } from './backend';

export interface IEnvironment {
  call_function(name: string, args: object[]): object;
}

export interface GasState {
  gas_limit: number;
  externally_used_gas: number;
}

export interface ContextData {
  gas_state: GasState;
  storage: IStorage;
  storage_readonly: boolean;
  wasmer_instance: any;
}

export class Environment {
  public storage: IIterStorage;
  public querier: IQuerier;
  public backendApi: IBackendApi;
  public data: ContextData;

  constructor(
    storage: IIterStorage,
    querier: IQuerier,
    backendApi: IBackendApi,
    data: ContextData
  ) {
    this.storage = storage;
    this.querier = querier;
    this.backendApi = backendApi;
    this.data = data;
    this.call_function = this.call_function.bind(this);
  }

  call_function(name: string, args: object[] = []): object {
    if (name.length === 0) {
      throw new Error('Empty function name');
    }

    if (args.length === 0) {
      console.log('No arguments passed');
    }

    return {};
  }

  public is_storage_readonly(): boolean {
    return this.data.storage_readonly;
  }
}
