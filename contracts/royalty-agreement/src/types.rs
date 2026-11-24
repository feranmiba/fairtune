use soroban_sdk::{contracttype, Address, BytesN, String, Vec};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AgreementStatus {
    PendingApproval = 0,
    Active = 1,
    Funded = 2,
    Completed = 3,
    Cancelled = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Participant {
    pub address: Address,
    pub basis_points: u32, // 10,000 total = 100.00%
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoyaltyAgreement {
    pub id: u64,
    pub creator: Address,
    pub track_id: String,
    pub metadata_hash: BytesN<32>,
    pub token: Address,
    pub participants: Vec<Participant>,
    pub approvals: Vec<Address>,
    pub status: AgreementStatus,
    pub total_deposited: i128,
    pub total_distributed: i128,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    Agreement(u64),
    AgreementCount,
    AgreementByHash(BytesN<32>),
    Admin,
}
