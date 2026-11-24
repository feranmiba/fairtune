import { Test, TestingModule } from '@nestjs/testing';
import { TransactionBuilderService } from './transaction-builder.service';
import { StellarNetworkService } from './stellar-network.service';
import { SorobanContractService } from './soroban-contract.service';
import { BadRequestException } from '@nestjs/common';

describe('TransactionBuilderService', () => {
  let service: TransactionBuilderService;
  let mockNetworkService: any;
  let mockSorobanService: any;
  let mockHorizonServer: any;
  let mockRpcServer: any;

  beforeEach(async () => {
    mockHorizonServer = {
      loadAccount: jest.fn().mockResolvedValue({
        accountId: () => 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        sequenceNumber: () => '100',
        incrementSequenceNumber: () => {},
      }),
    };

    mockRpcServer = {
      simulateTransaction: jest.fn().mockResolvedValue({
        minResourceFee: '1500',
        transactionData: {
          build: () => {},
        },
        cost: { cpuInsns: '100', memBytes: '200' },
        events: [],
      }),
    };

    mockNetworkService = {
      getServer: () => mockHorizonServer,
      getRpcServer: () => mockRpcServer,
      getNetworkPassphrase: () => 'Test SDF Network ; September 2015',
    };

    mockSorobanService = {
      getContractId: () => 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionBuilderService,
        { provide: StellarNetworkService, useValue: mockNetworkService },
        { provide: SorobanContractService, useValue: mockSorobanService },
      ],
    }).compile();

    service = module.get<TransactionBuilderService>(TransactionBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build and simulate an unsigned create_agreement transaction', async () => {
    const result = await service.buildCreateAgreementTx({
      creatorAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      trackId: 'TRACK_TEST_1',
      metadataHashHex: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      tokenAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
      participants: [
        {
          address: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          basisPoints: 10000,
        },
      ],
    });

    expect(result).toBeDefined();
    expect(result.unsignedXdr).toBeDefined();
    expect(result.simulatedSuccess).toBe(true);
    expect(mockHorizonServer.loadAccount).toHaveBeenCalled();
    expect(mockRpcServer.simulateTransaction).toHaveBeenCalled();
  });

  it('should reject invalid metadata hash length', async () => {
    await expect(
      service.buildCreateAgreementTx({
        creatorAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        trackId: 'TRACK_INVALID',
        metadataHashHex: 'short_hash',
        tokenAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
        participants: [],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should build an unsigned approve_agreement transaction', async () => {
    const result = await service.buildApproveAgreementTx({
      collaboratorAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      onChainAgreementId: '1',
    });

    expect(result).toBeDefined();
    expect(result.unsignedXdr).toBeDefined();
    expect(result.simulatedSuccess).toBe(true);
  });

  it('should build an unsigned deposit_escrow transaction', async () => {
    const result = await service.buildDepositEscrowTx({
      depositorAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      onChainAgreementId: '1',
      amount: '10000000',
    });

    expect(result).toBeDefined();
    expect(result.unsignedXdr).toBeDefined();
    expect(result.simulatedSuccess).toBe(true);
  });

  it('should build an unsigned distribute_royalties transaction', async () => {
    const result = await service.buildDistributeRoyaltiesTx({
      callerAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      onChainAgreementId: '1',
    });

    expect(result).toBeDefined();
    expect(result.unsignedXdr).toBeDefined();
    expect(result.simulatedSuccess).toBe(true);
  });
});
