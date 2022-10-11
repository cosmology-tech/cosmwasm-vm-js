
export type Address = string;

/** Port of [Env (Rust)](https://docs.rs/cosmwasm-std/1.1.4/cosmwasm_std/struct.Env.html) */
export type Env = {
  block: BlockInfo;
  transaction?: TransactionInfo;
  contract: ContractInfo;
}

export type BlockInfo = {
  height: number | string;
  time: number | string;
  chain_id: string;
}

export type TransactionInfo = {
  index: number | string;
}

export type ContractInfo = {
  address: Address;
}

/** By example of [@cosmjs/amino](https://cosmos.github.io/cosmjs/latest/amino/interfaces/Coin.html) */
export type Coin = {
  denom: string;
  amount: string;
}

/** Port of [MessageInfo (Rust)](https://docs.rs/cosmwasm-std/1.1.4/cosmwasm_std/struct.MessageInfo.html) */
export type MessageInfo = {
  sender: Address;
  funds: Coin[];
}
