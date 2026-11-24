use crate::errors::ContractError;
use crate::events::*;
use crate::types::*;
use soroban_sdk::{
    contract, contractimpl, token, Address, BytesN, Env, String, Vec,
};

#[contract]
pub struct FairTuneRoyaltyContract;

#[contractimpl]
impl FairTuneRoyaltyContract {
    /// Creates a new proposed royalty agreement in PENDING_APPROVAL state.
    pub fn create_agreement(
        env: Env,
        creator: Address,
        track_id: String,
        metadata_hash: BytesN<32>,
        token: Address,
        participants: Vec<Participant>,
    ) -> Result<u64, ContractError> {
        creator.require_auth();

        let p_len = participants.len();
        if p_len == 0 {
            return Err(ContractError::EmptyParticipants);
        }
        if p_len > 20 {
            return Err(ContractError::TooManyParticipants);
        }

        // Check metadata_hash uniqueness
        let hash_key = DataKey::AgreementByHash(metadata_hash.clone());
        if env.storage().persistent().has(&hash_key) {
            return Err(ContractError::AgreementAlreadyExists);
        }

        // Validate allocations and participant addresses
        let mut total_basis_points: u32 = 0;
        let mut seen_addresses: Vec<Address> = Vec::new(&env);

        for i in 0..p_len {
            let p = participants.get(i).unwrap();

            if p.basis_points == 0 {
                return Err(ContractError::ZeroOrNegativeAllocation);
            }

            // Reject duplicate participants
            for j in 0..seen_addresses.len() {
                if seen_addresses.get(j).unwrap() == p.address {
                    return Err(ContractError::DuplicateParticipant);
                }
            }
            seen_addresses.push_back(p.address.clone());

            total_basis_points = total_basis_points
                .checked_add(p.basis_points)
                .ok_or(ContractError::ArithmeticOverflow)?;
        }

        if total_basis_points != 10_000 {
            return Err(ContractError::InvalidBasisPointsTotal);
        }

        // Next agreement ID
        let count_key = DataKey::AgreementCount;
        let current_count: u64 = env.storage().persistent().get(&count_key).unwrap_or(0);
        let agreement_id = current_count.checked_add(1).ok_or(ContractError::ArithmeticOverflow)?;

        // Auto-approve creator if creator is one of the participants
        let mut approvals: Vec<Address> = Vec::new(&env);
        for i in 0..p_len {
            let p = participants.get(i).unwrap();
            if p.address == creator {
                approvals.push_back(creator.clone());
                emit_agreement_approved(&env, agreement_id, &creator);
                break;
            }
        }

        // If all participants are already approved (e.g. 1-person split or creator sole participant)
        let initial_status = if approvals.len() == participants.len() {
            emit_agreement_activated(&env, agreement_id);
            AgreementStatus::Active
        } else {
            AgreementStatus::PendingApproval
        };

        let now = env.ledger().timestamp();
        let agreement = RoyaltyAgreement {
            id: agreement_id,
            creator: creator.clone(),
            track_id,
            metadata_hash: metadata_hash.clone(),
            token: token.clone(),
            participants,
            approvals,
            status: initial_status,
            total_deposited: 0,
            total_distributed: 0,
            created_at: now,
        };

        // Persist records
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id), &agreement);
        env.storage()
            .persistent()
            .set(&hash_key, &agreement_id);
        env.storage().persistent().set(&count_key, &agreement_id);

        emit_agreement_created(&env, agreement_id, &creator, &token);

        Ok(agreement_id)
    }

    /// Records explicit on-chain collaborator approval for an agreement.
    pub fn approve_agreement(
        env: Env,
        collaborator: Address,
        agreement_id: u64,
    ) -> Result<(), ContractError> {
        collaborator.require_auth();

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: RoyaltyAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::AgreementNotFound)?;

        if agreement.status != AgreementStatus::PendingApproval {
            return Err(ContractError::AgreementAlreadyActive);
        }

        // Check if collaborator is an assigned participant
        let mut is_participant = false;
        for i in 0..agreement.participants.len() {
            if agreement.participants.get(i).unwrap().address == collaborator {
                is_participant = true;
                break;
            }
        }
        if !is_participant {
            return Err(ContractError::NotAParticipant);
        }

        // Check if collaborator already approved
        for i in 0..agreement.approvals.len() {
            if agreement.approvals.get(i).unwrap() == collaborator {
                return Err(ContractError::AlreadyApproved);
            }
        }

        agreement.approvals.push_back(collaborator.clone());
        emit_agreement_approved(&env, agreement_id, &collaborator);

        // Check if all participants have approved
        if agreement.approvals.len() == agreement.participants.len() {
            agreement.status = AgreementStatus::Active;
            emit_agreement_activated(&env, agreement_id);
        }

        env.storage().persistent().set(&key, &agreement);

        Ok(())
    }

    /// Deposits supported token funds into the agreement escrow.
    pub fn deposit_escrow(
        env: Env,
        depositor: Address,
        agreement_id: u64,
        amount: i128,
    ) -> Result<(), ContractError> {
        depositor.require_auth();

        if amount <= 0 {
            return Err(ContractError::ZeroDepositAmount);
        }

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: RoyaltyAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::AgreementNotFound)?;

        if agreement.status != AgreementStatus::Active && agreement.status != AgreementStatus::Funded {
            return Err(ContractError::AgreementNotActive);
        }

        // Transfer tokens from depositor to this contract address
        let token_client = token::Client::new(&env, &agreement.token);
        token_client.transfer(&depositor, &env.current_contract_address(), &amount);

        agreement.total_deposited = agreement
            .total_deposited
            .checked_add(amount)
            .ok_or(ContractError::ArithmeticOverflow)?;
        agreement.status = AgreementStatus::Funded;

        env.storage().persistent().set(&key, &agreement);

        emit_escrow_deposited(&env, agreement_id, &depositor, amount);

        Ok(())
    }

    /// Distributes accumulated escrow balance to all participants according to approved splits.
    pub fn distribute_royalties(
        env: Env,
        caller: Address,
        agreement_id: u64,
    ) -> Result<i128, ContractError> {
        caller.require_auth();

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: RoyaltyAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::AgreementNotFound)?;

        if agreement.status != AgreementStatus::Active && agreement.status != AgreementStatus::Funded {
            return Err(ContractError::AgreementNotActive);
        }

        let distributable = agreement
            .total_deposited
            .checked_sub(agreement.total_distributed)
            .ok_or(ContractError::ArithmeticOverflow)?;

        if distributable <= 0 {
            return Err(ContractError::InsufficientEscrowBalance);
        }

        let token_client = token::Client::new(&env, &agreement.token);
        let mut distributed_sum: i128 = 0;

        // Distribute to each participant
        for i in 0..agreement.participants.len() {
            let p = agreement.participants.get(i).unwrap();
            let share = distributable
                .checked_mul(p.basis_points as i128)
                .ok_or(ContractError::ArithmeticOverflow)?
                .checked_div(10_000)
                .ok_or(ContractError::ArithmeticOverflow)?;

            if share > 0 {
                token_client.transfer(&env.current_contract_address(), &p.address, &share);
                distributed_sum = distributed_sum
                    .checked_add(share)
                    .ok_or(ContractError::ArithmeticOverflow)?;
            }
        }

        // Deterministic remainder handling (dust units stay with creator, zero leak)
        let remainder = distributable
            .checked_sub(distributed_sum)
            .ok_or(ContractError::ArithmeticOverflow)?;

        if remainder > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &agreement.creator,
                &remainder,
            );
        }

        agreement.total_distributed = agreement
            .total_distributed
            .checked_add(distributable)
            .ok_or(ContractError::ArithmeticOverflow)?;

        env.storage().persistent().set(&key, &agreement);

        emit_royalties_distributed(&env, agreement_id, distributable, remainder);

        Ok(distributable)
    }

    /// Cancels an unapproved agreement, or an active agreement that has zero remaining funds.
    pub fn cancel_agreement(
        env: Env,
        caller: Address,
        agreement_id: u64,
    ) -> Result<(), ContractError> {
        caller.require_auth();

        let key = DataKey::Agreement(agreement_id);
        let mut agreement: RoyaltyAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::AgreementNotFound)?;

        if agreement.status == AgreementStatus::Cancelled {
            return Err(ContractError::InvalidStateTransition);
        }

        if caller != agreement.creator {
            return Err(ContractError::Unauthorized);
        }

        let remaining = agreement
            .total_deposited
            .checked_sub(agreement.total_distributed)
            .ok_or(ContractError::ArithmeticOverflow)?;

        if remaining > 0 {
            return Err(ContractError::CannotCancelActiveWithFunds);
        }

        agreement.status = AgreementStatus::Cancelled;
        env.storage().persistent().set(&key, &agreement);

        emit_agreement_cancelled(&env, agreement_id, &caller);

        Ok(())
    }

    /// Retrieves an agreement by its ID.
    pub fn get_agreement(env: Env, agreement_id: u64) -> Option<RoyaltyAgreement> {
        let key = DataKey::Agreement(agreement_id);
        env.storage().persistent().get(&key)
    }

    /// Retrieves the status of an agreement.
    pub fn get_agreement_status(env: Env, agreement_id: u64) -> Result<AgreementStatus, ContractError> {
        let agreement = Self::get_agreement(env, agreement_id).ok_or(ContractError::AgreementNotFound)?;
        Ok(agreement.status)
    }

    /// Retrieves total count of agreements created.
    pub fn get_agreement_count(env: Env) -> u64 {
        env.storage().persistent().get(&DataKey::AgreementCount).unwrap_or(0)
    }

    /// Retrieves the undistributed escrow balance of an agreement.
    pub fn get_undistributed_balance(env: Env, agreement_id: u64) -> Result<i128, ContractError> {
        let agreement = Self::get_agreement(env, agreement_id).ok_or(ContractError::AgreementNotFound)?;
        agreement
            .total_deposited
            .checked_sub(agreement.total_distributed)
            .ok_or(ContractError::ArithmeticOverflow)
    }
}
