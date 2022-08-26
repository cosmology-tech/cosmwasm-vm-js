import * as BackendApi from './backendApi';
import * as Querier from './querier';
import * as Storage from './storage';

export * from './backendApi';
export * from './querier';
export * from './storage';

export interface IBackend {
  backend_api: BackendApi.IBackendApi;
  querier: Querier.IQuerier;
  storage: Storage.IIterStorage;
}
