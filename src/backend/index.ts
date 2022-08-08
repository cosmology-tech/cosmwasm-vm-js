import * as BackendApi from './backend-api';
import * as Querier from './querier';
import * as Storage from './storage';

export * from './backend-api';
export * from './querier';
export * from './storage';

export interface IBackend {
  backend_api: BackendApi.IBackendApi;
  querier: Querier.IQuerier;
  storage: Storage.IStorage;
}
