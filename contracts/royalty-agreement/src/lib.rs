#![no_std]

pub mod contract;
pub mod errors;
pub mod events;
pub mod types;

pub use contract::FairTuneRoyaltyContract;
pub use contract::FairTuneRoyaltyContractClient;
pub use errors::ContractError;
pub use types::*;

#[cfg(test)]
mod test;
