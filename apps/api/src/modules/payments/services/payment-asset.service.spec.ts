import { Test, TestingModule } from '@nestjs/testing';
import { PaymentAssetService } from './payment-asset.service';
import { PrismaService } from '../../../database/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StellarNetwork } from '@fairtune/shared';

describe('PaymentAssetService', () => {
  let service: PaymentAssetService;
  let prisma: any;

  const mockAsset = {
    id: 'asset-1',
    code: 'USDC',
    name: 'USD Coin',
    contractAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    issuerPublicKey: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    decimals: 7,
    network: StellarNetwork.TESTNET,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      paymentAsset: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentAssetService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PaymentAssetService>(PaymentAssetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAsset', () => {
    it('should create an asset when contract does not exist', async () => {
      prisma.paymentAsset.findUnique.mockResolvedValue(null);
      prisma.paymentAsset.create.mockResolvedValue(mockAsset);

      const res = await service.createAsset({
        code: 'USDC',
        name: 'USD Coin',
        contractAddress: mockAsset.contractAddress,
        decimals: 7,
        network: StellarNetwork.TESTNET,
        isActive: true,
      });

      expect(res).toEqual(mockAsset);
      expect(prisma.paymentAsset.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if asset contract already exists', async () => {
      prisma.paymentAsset.findUnique.mockResolvedValue(mockAsset);

      await expect(
        service.createAsset({
          code: 'USDC',
          name: 'USD Coin',
          contractAddress: mockAsset.contractAddress,
          decimals: 7,
          network: StellarNetwork.TESTNET,
          isActive: true,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('toSubunits and fromSubunits decimal precision', () => {
    it('should convert decimal strings to integer subunits accurately without floating point error', () => {
      expect(service.toSubunits('100.5', 7)).toBe('1005000000');
      expect(service.toSubunits('0.0000001', 7)).toBe('1');
      expect(service.toSubunits('50', 7)).toBe('500000000');
      expect(service.toSubunits('0.0001234', 7)).toBe('1234');
    });

    it('should convert integer subunits back to decimal strings accurately', () => {
      expect(service.fromSubunits('1005000000', 7)).toBe('100.5');
      expect(service.fromSubunits('1', 7)).toBe('0.0000001');
      expect(service.fromSubunits('500000000', 7)).toBe('50');
      expect(service.fromSubunits('1234', 7)).toBe('0.0001234');
      expect(service.fromSubunits(BigInt(10000000), 7)).toBe('1');
    });
  });

  describe('getAssetById', () => {
    it('should throw NotFoundException if asset not found', async () => {
      prisma.paymentAsset.findUnique.mockResolvedValue(null);
      await expect(service.getAssetById('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
