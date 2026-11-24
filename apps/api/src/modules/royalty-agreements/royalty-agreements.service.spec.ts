import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RoyaltyAgreementsService } from './royalty-agreements.service';
import { PrismaService } from '../../database/prisma.service';
import { CollaboratorsService } from '../collaborators/collaborators.service';
import { StellarNetwork, AgreementStatus } from '@fairtune/shared';

describe('RoyaltyAgreementsService', () => {
  let service: RoyaltyAgreementsService;
  let prisma: {
    royaltyAgreement: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let collaboratorsService: {
    findOrCreate: jest.Mock;
  };

  const validStellarWallet1 = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const validStellarWallet2 = 'GCLX4B55WXYKUG22XW3B7YCKP32C2Z7B3J7J373X7C2V4V2V3V4V5V6A';

  beforeEach(async () => {
    prisma = {
      royaltyAgreement: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    collaboratorsService = {
      findOrCreate: jest.fn().mockImplementation((displayName, walletAddress) =>
        Promise.resolve({
          id: `collab-${walletAddress.slice(0, 8)}`,
          displayName,
          walletAddress,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoyaltyAgreementsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CollaboratorsService, useValue: collaboratorsService },
      ],
    }).compile();

    service = module.get<RoyaltyAgreementsService>(RoyaltyAgreementsService);
  });

  describe('Royalty Allocation Percentage Validation', () => {
    it('should reject agreements whose participants sum to less than 100%', async () => {
      const input = {
        title: 'Underallocated Song',
        trackName: 'Midnight Beat',
        stellarNetwork: StellarNetwork.TESTNET,
        participants: [
          {
            displayName: 'Producer',
            walletAddress: validStellarWallet1,
            royaltyPercentage: 50.0,
          },
          {
            displayName: 'Vocalist',
            walletAddress: validStellarWallet2,
            royaltyPercentage: 40.0, // Total = 90% (Missing 10%)
          },
        ],
      };

      await expect(service.createAgreement('user-1', input)).rejects.toThrow(BadRequestException);
    });

    it('should reject agreements whose participants sum to more than 100%', async () => {
      const input = {
        title: 'Overallocated Song',
        trackName: 'Midnight Beat',
        stellarNetwork: StellarNetwork.TESTNET,
        participants: [
          {
            displayName: 'Producer',
            walletAddress: validStellarWallet1,
            royaltyPercentage: 70.0,
          },
          {
            displayName: 'Vocalist',
            walletAddress: validStellarWallet2,
            royaltyPercentage: 40.0, // Total = 110%
          },
        ],
      };

      await expect(service.createAgreement('user-1', input)).rejects.toThrow(BadRequestException);
    });

    it('should successfully create an agreement when percentages equal exactly 100.00%', async () => {
      const input = {
        title: 'Balanced Agreement',
        trackName: 'Solar Flare',
        description: 'Equal split between songwriter and producer',
        stellarNetwork: StellarNetwork.TESTNET,
        participants: [
          {
            displayName: 'Producer',
            walletAddress: validStellarWallet1,
            royaltyPercentage: 66.67,
          },
          {
            displayName: 'Songwriter',
            walletAddress: validStellarWallet2,
            royaltyPercentage: 33.33,
          },
        ],
      };

      prisma.royaltyAgreement.create.mockResolvedValue({
        id: 'agreement-uuid-1',
        creatorId: 'user-1',
        title: input.title,
        status: AgreementStatus.PENDING_APPROVAL,
        participants: input.participants,
      });

      const result = await service.createAgreement('user-1', input);

      expect(collaboratorsService.findOrCreate).toHaveBeenCalledTimes(2);
      expect(prisma.royaltyAgreement.create).toHaveBeenCalled();
      expect(result.id).toBe('agreement-uuid-1');
    });
  });
});
