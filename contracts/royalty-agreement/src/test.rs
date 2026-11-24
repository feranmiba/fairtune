#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{self, StellarAssetClient},
    vec, Address, BytesN, Env, String, Vec,
};

fn create_token_contract<'a>(
    env: &Env,
    admin: &Address,
) -> (token::Client<'a>, StellarAssetClient<'a>) {
    let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
    (
        token::Client::new(env, &token_address),
        StellarAssetClient::new(env, &token_address),
    )
}

fn sample_metadata_hash(env: &Env, byte: u8) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[0] = byte;
    BytesN::from_array(env, &bytes)
}

#[test]
fn test_successful_agreement_creation_and_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(FairTuneRoyaltyContract, ());
    let client = FairTuneRoyaltyContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let producer = Address::generate(&env);
    let songwriter = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let (token_client, _) = create_token_contract(&env, &token_admin);

    let participants: Vec<Participant> = vec![
        &env,
        Participant {
            address: creator.clone(),
            basis_points: 5000, // 50%
        },
        Participant {
            address: producer.clone(),
            basis_points: 3000, // 30%
        },
        Participant {
            address: songwriter.clone(),
            basis_points: 2000, // 20%
        },
    ];

    let track_id = String::from_str(&env, "TRACK_NEON_LIGHTS_2026");
    let metadata_hash = sample_metadata_hash(&env, 1);

    // 1. Create Agreement
    let agreement_id = client.create_agreement(
        &creator,
        &track_id,
        &metadata_hash,
        &token_client.address,
        &participants,
    );

    assert_eq!(agreement_id, 1);

    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement.status, AgreementStatus::PendingApproval);
    assert_eq!(agreement.approvals.len(), 1); // Creator auto-approved as participant

    // 2. Collaborator Approvals
    client.approve_agreement(&producer, &agreement_id);
    let updated = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(updated.status, AgreementStatus::PendingApproval);
    assert_eq!(updated.approvals.len(), 2);

    // Songwriter approves -> All approved -> Status becomes Active
    client.approve_agreement(&songwriter, &agreement_id);
    let active_agreement = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(active_agreement.status, AgreementStatus::Active);
    assert_eq!(active_agreement.approvals.len(), 3);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_rejects_invalid_basis_points_total() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(FairTuneRoyaltyContract, ());
    let client = FairTuneRoyaltyContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let collaborator = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let (token_client, _) = create_token_contract(&env, &token_admin);

    let participants: Vec<Participant> = vec![
        &env,
        Participant {
            address: creator.clone(),
            basis_points: 5000,
        },
        Participant {
            address: collaborator.clone(),
            basis_points: 4000, // Total = 9000, not 10000
        },
    ];

    client.create_agreement(
        &creator,
        &String::from_str(&env, "TRACK_INVALID"),
        &sample_metadata_hash(&env, 2),
        &token_client.address,
        &participants,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_rejects_duplicate_participants() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(FairTuneRoyaltyContract, ());
    let client = FairTuneRoyaltyContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let (token_client, _) = create_token_contract(&env, &token_admin);

    let participants: Vec<Participant> = vec![
        &env,
        Participant {
            address: creator.clone(),
            basis_points: 5000,
        },
        Participant {
            address: creator.clone(), // Duplicate address!
            basis_points: 5000,
        },
    ];

    client.create_agreement(
        &creator,
        &String::from_str(&env, "TRACK_DUP"),
        &sample_metadata_hash(&env, 3),
        &token_client.address,
        &participants,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn test_rejects_deposit_before_activation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(FairTuneRoyaltyContract, ());
    let client = FairTuneRoyaltyContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let collaborator = Address::generate(&env);
    let depositor = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);

    token_admin_client.mint(&depositor, &10_000);

    let participants: Vec<Participant> = vec![
        &env,
        Participant {
            address: creator.clone(),
            basis_points: 5000,
        },
        Participant {
            address: collaborator.clone(),
            basis_points: 5000,
        },
    ];

    let agreement_id = client.create_agreement(
        &creator,
        &String::from_str(&env, "TRACK_UNAPPROVED"),
        &sample_metadata_hash(&env, 4),
        &token_client.address,
        &participants,
    );

    // Collaborator has not approved yet, status is PendingApproval
    client.deposit_escrow(&depositor, &agreement_id, &5_000);
}

#[test]
fn test_escrow_deposit_and_deterministic_distribution() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(FairTuneRoyaltyContract, ());
    let client = FairTuneRoyaltyContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let producer = Address::generate(&env);
    let songwriter = Address::generate(&env);
    let depositor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);

    // Fund depositor with 10,000 units
    token_admin_client.mint(&depositor, &10_000);

    let participants: Vec<Participant> = vec![
        &env,
        Participant {
            address: creator.clone(),
            basis_points: 5000, // 50%
        },
        Participant {
            address: producer.clone(),
            basis_points: 3000, // 30%
        },
        Participant {
            address: songwriter.clone(),
            basis_points: 2000, // 20%
        },
    ];

    let agreement_id = client.create_agreement(
        &creator,
        &String::from_str(&env, "TRACK_REVENUE"),
        &sample_metadata_hash(&env, 5),
        &token_client.address,
        &participants,
    );

    // Approve all
    client.approve_agreement(&producer, &agreement_id);
    client.approve_agreement(&songwriter, &agreement_id);

    // Deposit 10,000 into escrow
    client.deposit_escrow(&depositor, &agreement_id, &10_000);

    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement.status, AgreementStatus::Funded);
    assert_eq!(agreement.total_deposited, 10_000);
    assert_eq!(token_client.balance(&contract_id), 10_000);

    // Distribute
    let distributed = client.distribute_royalties(&creator, &agreement_id);
    assert_eq!(distributed, 10_000);

    // Verify collaborator balances
    assert_eq!(token_client.balance(&creator), 5_000);
    assert_eq!(token_client.balance(&producer), 3_000);
    assert_eq!(token_client.balance(&songwriter), 2_000);
    assert_eq!(token_client.balance(&contract_id), 0);

    let post_dist = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(post_dist.total_distributed, 10_000);
}

#[test]
fn test_distribution_remainder_handling_zero_leak() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(FairTuneRoyaltyContract, ());
    let client = FairTuneRoyaltyContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let collaborator1 = Address::generate(&env);
    let collaborator2 = Address::generate(&env);
    let depositor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let (token_client, token_admin_client) = create_token_contract(&env, &token_admin);

    // Deposit an odd amount: 10,001 stroops with 3333 bps / 3333 bps / 3334 bps
    let deposit_amount: i128 = 10_001;
    token_admin_client.mint(&depositor, &deposit_amount);

    let participants: Vec<Participant> = vec![
        &env,
        Participant {
            address: creator.clone(),
            basis_points: 3334,
        },
        Participant {
            address: collaborator1.clone(),
            basis_points: 3333,
        },
        Participant {
            address: collaborator2.clone(),
            basis_points: 3333,
        },
    ];

    let agreement_id = client.create_agreement(
        &creator,
        &String::from_str(&env, "TRACK_ODD_AMOUNT"),
        &sample_metadata_hash(&env, 6),
        &token_client.address,
        &participants,
    );

    client.approve_agreement(&collaborator1, &agreement_id);
    client.approve_agreement(&collaborator2, &agreement_id);

    client.deposit_escrow(&depositor, &agreement_id, &deposit_amount);
    client.distribute_royalties(&creator, &agreement_id);

    let bal_creator = token_client.balance(&creator);
    let bal_c1 = token_client.balance(&collaborator1);
    let bal_c2 = token_client.balance(&collaborator2);

    // Total distributed across all 3 participants must equal exactly deposit_amount
    assert_eq!(bal_creator + bal_c1 + bal_c2, deposit_amount);
    // Contract balance must be exactly 0
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn test_cancellation_rules() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(FairTuneRoyaltyContract, ());
    let client = FairTuneRoyaltyContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let collaborator = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let (token_client, _) = create_token_contract(&env, &token_admin);

    let participants: Vec<Participant> = vec![
        &env,
        Participant {
            address: creator.clone(),
            basis_points: 5000,
        },
        Participant {
            address: collaborator.clone(),
            basis_points: 5000,
        },
    ];

    let agreement_id = client.create_agreement(
        &creator,
        &String::from_str(&env, "TRACK_CANCEL"),
        &sample_metadata_hash(&env, 7),
        &token_client.address,
        &participants,
    );

    // Pending agreement can be cancelled by creator
    client.cancel_agreement(&creator, &agreement_id);
    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement.status, AgreementStatus::Cancelled);
}
