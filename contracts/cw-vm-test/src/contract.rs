#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    to_binary, Binary, CanonicalAddr, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{CountResponse, ExecuteMsg, InstantiateMsg, QueryMsg};
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
    let state = State {
        count: msg.count,
        owner: info.sender.clone(),
    };
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    STATE.save(deps.storage, &state)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("owner", info.sender)
        .add_attribute("count", msg.count.to_string()))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Increment {} => try_increment(deps),
        ExecuteMsg::Reset { count } => try_reset(deps, info, count),
        ExecuteMsg::AddrValidate { str } => try_addr_validate(deps, str),
        ExecuteMsg::AddrHumanize { str } => try_addr_humanize(deps, str),
        ExecuteMsg::AddrCanonicalize { str } => try_addr_canonicalize(deps, str),
        ExecuteMsg::Secp256k1Verify { hash, signature, public_keystr } => try_secp256k1_verify(deps, hash, signature, public_keystr),
        ExecuteMsg::Debug { message } => try_debug(deps, message),
        ExecuteMsg::DbWrite { key, value } => try_db_write(deps, key, value),
        ExecuteMsg::DbRead { key } => try_db_read(deps, key),
    }
}

pub fn try_debug(_deps: DepsMut,_message: String) -> Result<Response, ContractError> {
    Ok(Default::default())
}

pub fn try_db_write(deps: DepsMut, key: String, value: String) -> Result<Response, ContractError> {
    deps.storage.set(key.as_bytes(), value.as_bytes());
    Ok(Default::default())
}

pub fn try_db_read(deps: DepsMut, key: String) -> Result<Response, ContractError> {
    let value = deps.storage.get(key.as_bytes()).unwrap();
    Ok(Response::default().add_attribute("value", String::from_utf8(value).unwrap()))
}

pub fn try_addr_humanize(deps: DepsMut, str: String) -> Result<Response, ContractError> {
    Ok(Response::new().add_attribute(
        "result",
        deps.api
            .addr_humanize(&CanonicalAddr::from(str.as_bytes()))?
            .to_string(),
    ))
}

pub fn try_addr_canonicalize(deps: DepsMut, str: String) -> Result<Response, ContractError> {
    Ok(Response::new().add_attribute("result", deps.api.addr_canonicalize(&str)?.to_string()))
}

pub fn try_secp256k1_verify(deps: DepsMut,hash: String,  signature: String, public_keystr: String) -> Result<Response, ContractError> {

    let hashed = hex::decode(&hash).unwrap();
    let signed = hex::decode(&signature).unwrap();
    let pubkey = hex::decode(&public_keystr).unwrap();

    let res = deps.api.secp256k1_verify(&hashed,&signed,&pubkey).unwrap_err();
    Ok(Response::new().add_attribute("result", res.to_string()))
}


pub fn try_addr_validate(deps: DepsMut, str: String) -> Result<Response, ContractError> {
    Ok(Response::new().add_attribute("result", deps.api.addr_validate(&str)?.to_string()))
}

pub fn try_increment(deps: DepsMut) -> Result<Response, ContractError> {
    STATE.update(deps.storage, |mut state| -> Result<_, ContractError> {
        state.count += 1;
        Ok(state)
    })?;

    Ok(Response::new().add_attribute("method", "try_increment"))
}
pub fn try_reset(deps: DepsMut, info: MessageInfo, count: i32) -> Result<Response, ContractError> {
    STATE.update(deps.storage, |mut state| -> Result<_, ContractError> {
        if info.sender != state.owner {
            return Err(ContractError::Unauthorized {});
        }
        state.count = count;
        Ok(state)
    })?;
    Ok(Response::new().add_attribute("method", "reset"))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetCount {} => to_binary(&query_count(deps)?),
    }
}

fn query_count(deps: Deps) -> StdResult<CountResponse> {
    let state = STATE.load(deps.storage)?;
    Ok(CountResponse { count: state.count })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, from_binary};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies(&[]);

        let msg = InstantiateMsg { count: 17 };
        let info = mock_info("creator", &coins(1000, "earth"));

        // we can just call .unwrap() to assert this was a success
        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // it worked, let's query the state
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetCount {}).unwrap();
        let value: CountResponse = from_binary(&res).unwrap();
        assert_eq!(17, value.count);
    }

    #[test]
    fn increment() {
        let mut deps = mock_dependencies(&coins(2, "token"));

        let msg = InstantiateMsg { count: 17 };
        let info = mock_info("creator", &coins(2, "token"));
        let _res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // beneficiary can release it
        let info = mock_info("anyone", &coins(2, "token"));
        let msg = ExecuteMsg::Increment {};
        let _res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        // should increase counter by 1
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetCount {}).unwrap();
        let value: CountResponse = from_binary(&res).unwrap();
        assert_eq!(18, value.count);
    }

    #[test]
    fn reset() {
        let mut deps = mock_dependencies(&coins(2, "token"));

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
        let value: CountResponse = from_binary(&res).unwrap();
        assert_eq!(5, value.count);
    }
}
