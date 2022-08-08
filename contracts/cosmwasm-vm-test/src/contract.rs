#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{to_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, GetCountResponse, InstantiateMsg, QueryMsg, TestAddrCanonicalizeResponse, TestAddrHumanizeResponse, TestAddrValidateResponse, TestDbReadResponse, TestDebugQueryResponse, TestEd25519BatchVerifyResponse, TestEd25519VerifyResponse, TestQueryChainResponse, TestSecp256k1RecoverPubkeyResponse, TestSecp256k1VerifyResponse};
use crate::state::{State, STATE};

// version info for migration info
const CONTRACT_NAME: &str = "crates.io:cosmwasm-vm-test";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    Ok(Response::default())
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::TestDbWrite { key, value } => try_test_db_write(deps, key, value),
        ExecuteMsg::TestDbRemove { key } => try_test_db_remove(deps, key),
        ExecuteMsg::TestDbScan { start, end, order } => try_test_db_scan(deps, start, end, order),
        ExecuteMsg::TestDbNext { iterator_id } => try_test_db_next(deps, iterator_id),
        ExecuteMsg::TestDebugExecute { } => try_test_debug_execute(deps),
    }
}

pub fn try_test_db_write(deps: DepsMut) -> Result<Response, ContractError> {
    unimplemented!()
}

pub fn try_test_db_remove(deps: DepsMut) -> Result<Response, ContractError> {
    unimplemented!()
}


pub fn try_test_db_scan(deps: DepsMut) -> Result<Response, ContractError> {
    unimplemented!()
}

pub fn try_test_db_next(deps: DepsMut) -> Result<Response, ContractError> {
    unimplemented!()
}

pub fn try_test_debug_execute(deps: DepsMut) -> Result<Response, ContractError> {
    unimplemented!()
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::TestDbRead { key } => to_binary(&query_test_db_read(deps)?),
        QueryMsg::TestAddrHumanize {} => to_binary(&query_test_addr_humanize(deps)?),
        QueryMsg::TestAddrCanonicalize {} => to_binary(&query_test_addr_canonicalize(deps)?),
        QueryMsg::TestAddrValidate {} => to_binary(&query_test_addr_validate(deps)?),
        QueryMsg::TestSecp256k1Verify {} => to_binary(&query_test_secp256k1_verify(deps)?),
        QueryMsg::TestSecp256k1RecoverPubkey {} => to_binary(&query_test_secp256k1_recover_pubkey(deps)?),
        QueryMsg::TestEd25519Verify {} => to_binary(&query_test_ed25519_verify(deps)?),
        QueryMsg::TestEd25519BatchVerify {} => to_binary(&query_test_ed25519_batch_verify(deps)?),
        QueryMsg::TestDebugQuery {} => to_binary(&query_test_debug_query(deps)?),
        QueryMsg::TestQueryChain {} => to_binary(&query_test_query_chain(deps)?),
    }
}

fn query_test_db_read(deps: Deps) -> StdResult<TestDbReadResponse> {
    unimplemented!()
}

fn query_test_addr_humanize(deps: Deps) -> StdResult<TestAddrHumanizeResponse> {
    unimplemented!()
}

fn query_test_addr_canonicalize(deps: Deps) -> StdResult<TestAddrCanonicalizeResponse> {
    unimplemented!()
}

fn query_test_addr_validate(deps: Deps) -> StdResult<TestAddrValidateResponse> {
    unimplemented!()
}

fn query_test_secp256k1_verify(deps: Deps) -> StdResult<TestSecp256k1VerifyResponse> {
    unimplemented!()
}

fn query_test_secp256k1_recover_pubkey(deps: Deps) -> StdResult<TestSecp256k1RecoverPubkeyResponse> {
    unimplemented!()
}

fn query_test_ed25519_verify(deps: Deps) -> StdResult<TestEd25519VerifyResponse> {
    unimplemented!()
}

fn query_test_ed25519_batch_verify(deps: Deps) -> StdResult<TestEd25519BatchVerifyResponse> {
    unimplemented!()
}

fn query_test_debug_query(deps: Deps) -> StdResult<TestDebugQueryResponse> {
    unimplemented!()
}

fn query_test_query_chain(deps: Deps) -> StdResult<TestQueryChainResponse> {
    unimplemented!()
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, from_binary};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg { count: 17 };
        let info = mock_info("creator", &coins(1000, "earth"));

        // we can just call .unwrap() to assert this was a success
        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // it worked, let's query the state
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetCount {}).unwrap();
        let value: GetCountResponse = from_binary(&res).unwrap();
        assert_eq!(17, value.count);
    }

    #[test]
    fn increment() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg { count: 17 };
        let info = mock_info("creator", &coins(2, "token"));
        let _res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // beneficiary can release it
        let info = mock_info("anyone", &coins(2, "token"));
        let msg = ExecuteMsg::Increment {};
        let _res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        // should increase counter by 1
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetCount {}).unwrap();
        let value: GetCountResponse = from_binary(&res).unwrap();
        assert_eq!(18, value.count);
    }

    #[test]
    fn reset() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg { count: 17 };
        let info = mock_info("creator", &coins(2, "token"));
        let _res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // beneficiary can release it
        let unauth_info = mock_info("anyone", &coins(2, "token"));
        let msg = ExecuteMsg::Reset { count: 5 };
        let res = execute(deps.as_mut(), mock_env(), unauth_info, msg);
        match res {
            Err(ContractError::Unauthorized {}) => {}
            _ => panic!("Must return unauthorized error"),
        }

        // only the original creator can reset the counter
        let auth_info = mock_info("creator", &coins(2, "token"));
        let msg = ExecuteMsg::Reset { count: 5 };
        let _res = execute(deps.as_mut(), mock_env(), auth_info, msg).unwrap();

        // should now be 5
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetCount {}).unwrap();
        let value: GetCountResponse = from_binary(&res).unwrap();
        assert_eq!(5, value.count);
    }
}
