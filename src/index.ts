import { eddsa } from 'elliptic';

export * from './memory';
export * from './backend';
export * from './instance';
export * from './environment';

global.eddsa = () => global._eddsa || (global._eddsa = new eddsa('ed25519'));
