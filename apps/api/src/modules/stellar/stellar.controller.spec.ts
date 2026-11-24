import { Test, TestingModule } from '@nestjs/testing';
import { StellarController } from './stellar.controller';
import { StellarNetworkService } from './services/stellar-network.service';
import { StellarAccountService } from './services/stellar-account.service';
import { StellarTransactionService } from './services/stellar-transaction.service';
import { SorobanContractService } from './services/soroban-contract.service';
import { TransactionBuilderService } from './services/transaction-builder.service';
import { TransactionSimulationService } from './services/transaction-simulation.service';
import { AgreementSyncService } from './services/agreement-sync.service';
import { PrismaService } from '../../database/prisma.service';
import { UserDto, UserRole, StellarNetwork } from '@fairtune/shared';

describe('StellarController', () => {
  let controller: StellarController;
  let mockNetworkService: any;
  let mockAccountService: any;
  let mockTxService: any;
  let mockSorobanService: any;
  let mockTxBuilderService: any;
  let mockTxSimulationService: any;
  let mockSyncService: any;
  let prisma: any;

  const mockUser: UserDto = {
    id: 'user-1',
    email: 'artist@fairtune.io',
    firstName: 'Alice',
    lastName: 'Vocalist',
    role: UserRole.ARTIST,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockNetworkService = {
      checkConnectivity: jest
        .fn()
        .mockResolvedValue({ connected: true, horizonVersion: '2.30.0', rpcHealthy: true }),
      getNetworkPassphrase: jest.fn().mockReturnValue('Test SDF Network ; September 2015'),
      getRpcUrl: jest.fn().mockReturnValue('https://soroban-testnet.stellar.org'),
    };

    mockAccountService = {
      isValidPublicKey: jest.fn().mockReturnValue(true),
      getAccount: jest.fn().mockResolvedValue({
        accountId: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      }),
    };

    mockTxService = {
      verifyTransaction: jest.fn().mockResolvedValue({ successful: true, hash: 'tx-hash-1' }),
    };

    mockSorobanService = {
      getContractConfig: jest.fn().mockReturnValue({
        contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
        rpcUrl: 'https://soroban-testnet.stellar.org',
      }),
      getContractId: jest
        .fn()
        .mockReturnValue('CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM'),
      getAgreement: jest.fn().mockResolvedValue({ id: '1', status: 'ACTIVE' }),
    };

    mockTxBuilderService = {
      buildCreateAgreementTx: jest.fn().mockResolvedValue({
        unsignedXdr: 'AAAA_CREATE_XDR',
        minFee: '1000',
        simulatedSuccess: true,
      }),
      buildApproveAgreementTx: jest.fn().mockResolvedValue({
        unsignedXdr: 'AAAA_APPROVE_XDR',
        minFee: '1000',
        simulatedSuccess: true,
      }),
      buildDepositEscrowTx: jest.fn().mockResolvedValue({
        unsignedXdr: 'AAAA_DEPOSIT_XDR',
        minFee: '1000',
        simulatedSuccess: true,
      }),
      buildDistributeRoyaltiesTx: jest.fn().mockResolvedValue({
        unsignedXdr: 'AAAA_DISTRIBUTE_XDR',
        minFee: '1000',
        simulatedSuccess: true,
      }),
    };

    mockTxSimulationService = {
      simulateTransactionXdr: jest
        .fn()
        .mockResolvedValue({ success: true, minResourceFee: '1200' }),
    };

    mockSyncService = {
      submitSignedTransaction: jest
        .fn()
        .mockResolvedValue({ hash: 'tx-hash-sub', status: 'SUCCESS' }),
      syncAgreementFromChain: jest
        .fn()
        .mockResolvedValue({ agreementId: 'agree-1', synced: true, onChainStatus: 'ACTIVE' }),
    };

    prisma = {
      royaltyAgreement: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'agree-1',
          creatorId: 'user-1',
          title: 'Album Deal',
          trackName: 'Midnight Groove',
          onChainAgreementId: '1',
          participants: [
            {
              collaborator: {
                walletAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
              },
              royaltyPercentage: 100,
            },
          ],
        }),
        update: jest.fn(),
      },
      transaction: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StellarController],
      providers: [
        { provide: StellarNetworkService, useValue: mockNetworkService },
        { provide: StellarAccountService, useValue: mockAccountService },
        { provide: StellarTransactionService, useValue: mockTxService },
        { provide: SorobanContractService, useValue: mockSorobanService },
        { provide: TransactionBuilderService, useValue: mockTxBuilderService },
        { provide: TransactionSimulationService, useValue: mockTxSimulationService },
        { provide: AgreementSyncService, useValue: mockSyncService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    controller = module.get<StellarController>(StellarController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return network status', async () => {
    const status = await controller.getNetworkStatus();
    expect(status.connectivity.connected).toBe(true);
    expect(status.passphrase).toContain('Test SDF Network');
  });

  it('should prepare create agreement transaction', async () => {
    const res = await controller.prepareCreateAgreement(mockUser, {
      agreementId: 'agree-1',
      creatorPublicKey: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      paymentTokenAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
      network: StellarNetwork.TESTNET,
    });

    expect(res.unsignedXdr).toBe('AAAA_CREATE_XDR');
    expect(res.metadataHash).toBeDefined();
  });

  it('should prepare collaborator approval transaction', async () => {
    const res = await controller.prepareApproveAgreement(mockUser, 'agree-1', {
      collaboratorPublicKey: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      network: StellarNetwork.TESTNET,
    });

    expect(res.unsignedXdr).toBe('AAAA_APPROVE_XDR');
  });

  it('should prepare escrow deposit transaction', async () => {
    const res = await controller.prepareDepositEscrow(mockUser, 'agree-1', {
      depositorPublicKey: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      amount: '10000000',
      network: StellarNetwork.TESTNET,
    });

    expect(res.unsignedXdr).toBe('AAAA_DEPOSIT_XDR');
  });

  it('should prepare distribute royalties transaction', async () => {
    const res = await controller.prepareDistributeRoyalties(mockUser, 'agree-1', {
      callerPublicKey: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      network: StellarNetwork.TESTNET,
    });

    expect(res.unsignedXdr).toBe('AAAA_DISTRIBUTE_XDR');
  });

  it('should sync agreement from chain', async () => {
    const res = await controller.syncAgreementState('agree-1');
    expect(res.synced).toBe(true);
    expect(res.onChainStatus).toBe('ACTIVE');
  });

  it('should submit signed transaction', async () => {
    const res = await controller.submitSignedTransaction(mockUser, {
      signedTxXdr: 'AAAA_SIGNED_XDR',
      network: StellarNetwork.TESTNET,
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.hash).toBe('tx-hash-sub');
  });
});
