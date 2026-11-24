use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    AgreementNotFound = 2,
    AgreementAlreadyExists = 3,
    InvalidBasisPointsTotal = 4,
    ZeroOrNegativeAllocation = 5,
    DuplicateParticipant = 6,
    EmptyParticipants = 7,
    TooManyParticipants = 8,
    Unauthorized = 9,
    NotAParticipant = 10,
    AlreadyApproved = 11,
    AgreementNotActive = 12,
    AgreementAlreadyActive = 13,
    InvalidStateTransition = 14,
    InsufficientEscrowBalance = 15,
    ZeroDepositAmount = 16,
    DistributionFailed = 17,
    CannotCancelActiveWithFunds = 18,
    ArithmeticOverflow = 19,
}
