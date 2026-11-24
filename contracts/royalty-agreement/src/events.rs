use soroban_sdk::{symbol_short, Address, Env};

pub fn emit_agreement_created(
    env: &Env,
    agreement_id: u64,
    creator: &Address,
    token: &Address,
) {
    env.events().publish(
        (symbol_short!("agree"), symbol_short!("created"), agreement_id),
        (creator.clone(), token.clone()),
    );
}

pub fn emit_agreement_approved(
    env: &Env,
    agreement_id: u64,
    collaborator: &Address,
) {
    env.events().publish(
        (symbol_short!("agree"), symbol_short!("approved"), agreement_id),
        collaborator.clone(),
    );
}

pub fn emit_agreement_activated(env: &Env, agreement_id: u64) {
    env.events().publish(
        (symbol_short!("agree"), symbol_short!("active"), agreement_id),
        agreement_id,
    );
}

pub fn emit_escrow_deposited(
    env: &Env,
    agreement_id: u64,
    depositor: &Address,
    amount: i128,
) {
    env.events().publish(
        (symbol_short!("escrow"), symbol_short!("deposit"), agreement_id),
        (depositor.clone(), amount),
    );
}

pub fn emit_royalties_distributed(
    env: &Env,
    agreement_id: u64,
    total_distributed: i128,
    remainder: i128,
) {
    env.events().publish(
        (symbol_short!("royalty"), symbol_short!("distrib"), agreement_id),
        (total_distributed, remainder),
    );
}

pub fn emit_agreement_cancelled(env: &Env, agreement_id: u64, canceller: &Address) {
    env.events().publish(
        (symbol_short!("agree"), symbol_short!("cancel"), agreement_id),
        canceller.clone(),
    );
}
