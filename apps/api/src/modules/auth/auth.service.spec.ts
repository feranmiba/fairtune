import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@fairtune/shared';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    refreshToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock_access_token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'jwt.accessExpiresIn') return '15m';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('Password Hashing with Argon2', () => {
    it('should securely hash passwords and verify matching plain text', async () => {
      const password = 'SuperSecurePassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');

      const isMatch = await service.verifyPassword(hash, password);
      expect(isMatch).toBe(true);

      const isMismatch = await service.verifyPassword(hash, 'WrongPassword!');
      expect(isMismatch).toBe(false);
    });
  });

  describe('register', () => {
    it('should register a new artist successfully and return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'artist@fairtune.io',
        firstName: 'Miles',
        lastName: 'Davis',
        role: UserRole.ARTIST,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        artistProfile: { id: 'profile-uuid', stageName: 'Miles' },
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        email: 'artist@fairtune.io',
        password: 'Password123!',
        firstName: 'Miles',
        lastName: 'Davis',
        stageName: 'Miles',
      });

      expect(result.user.email).toBe('artist@fairtune.io');
      expect(result.accessToken).toBe('mock_access_token');
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw ConflictException if user email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.register({
          email: 'duplicate@fairtune.io',
          password: 'Password123!',
          firstName: 'Duplicate',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@fairtune.io', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      const hash = await service.hashPassword('CorrectPassword123!');
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@fairtune.io',
        passwordHash: hash,
        role: UserRole.ARTIST,
      });

      await expect(
        service.login({ email: 'user@fairtune.io', password: 'IncorrectPassword!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user and tokens when credentials are valid', async () => {
      const password = 'CorrectPassword123!';
      const hash = await service.hashPassword(password);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@fairtune.io',
        passwordHash: hash,
        firstName: 'Miles',
        lastName: 'Davis',
        role: UserRole.ARTIST,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        artistProfile: null,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'user@fairtune.io', password });

      expect(result.accessToken).toBe('mock_access_token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('user@fairtune.io');
    });
  });

  describe('refreshTokens', () => {
    it('should rotate tokens and invalidate old token', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-id-1',
        userId: 'user-1',
        expiresAt,
        revokedAt: null,
        user: { id: 'user-1', email: 'user@fairtune.io', role: UserRole.ARTIST },
      });
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.refreshToken.update.mockResolvedValue({});

      const tokens = await service.refreshTokens({ refreshToken: 'valid-refresh-token' });

      expect(tokens.accessToken).toBe('mock_access_token');
      expect(tokens.refreshToken).toBeDefined();
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'token-id-1' },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('should detect token reuse and revoke token family on replay', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-id-stolen',
        userId: 'compromised-user-id',
        expiresAt: new Date(),
        revokedAt: new Date(), // Already revoked!
        user: { id: 'compromised-user-id', email: 'user@fairtune.io', role: UserRole.ARTIST },
      });

      await expect(service.refreshTokens({ refreshToken: 'reused-token' })).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'compromised-user-id' },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });
  });
});
