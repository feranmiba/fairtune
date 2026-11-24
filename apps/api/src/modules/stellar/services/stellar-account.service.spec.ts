import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StellarAccountService } from './stellar-account.service';
import { StellarNetworkService } from './stellar-network.service';

describe('StellarAccountService', () => {
  let service: StellarAccountService;
  let networkService: {
    getServer: jest.Mock;
  };

  const validStellarPublicKey = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const secretKeyStartingWithS = 'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  beforeEach(async () => {
    networkService = {
      getServer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarAccountService,
        { provide: StellarNetworkService, useValue: networkService },
      ],
    }).compile();

    service = module.get<StellarAccountService>(StellarAccountService);
  });

  describe('Stellar Public Key Validation', () => {
    it('should validate standard Ed25519 public keys (starting with G)', () => {
      expect(service.isValidPublicKey(validStellarPublicKey)).toBe(true);
    });

    it('should reject secret keys (starting with S)', () => {
      expect(service.isValidPublicKey(secretKeyStartingWithS)).toBe(false);
    });

    it('should reject malformed strings, ethereum addresses, and non-base32 keys', () => {
      expect(service.isValidPublicKey('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')).toBe(false);
      expect(service.isValidPublicKey('not-a-valid-key')).toBe(false);
      expect(service.isValidPublicKey('')).toBe(false);
    });

    it('should throw BadRequestException when trying to load an invalid public key', async () => {
      await expect(service.getAccount('invalid-key')).rejects.toThrow(BadRequestException);
    });
  });
});
