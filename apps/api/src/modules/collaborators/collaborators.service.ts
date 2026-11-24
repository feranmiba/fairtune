import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { isValidStellarPublicKeyFormat } from '@fairtune/shared';

@Injectable()
export class CollaboratorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(displayName: string, walletAddress: string, userId?: string) {
    if (!isValidStellarPublicKeyFormat(walletAddress)) {
      throw new BadRequestException(`Invalid Stellar wallet address: ${walletAddress}`);
    }

    let collaborator = await this.prisma.collaborator.findFirst({
      where: { walletAddress },
    });

    if (!collaborator) {
      collaborator = await this.prisma.collaborator.create({
        data: {
          displayName,
          walletAddress,
          userId: userId || undefined,
        },
      });
    }

    return collaborator;
  }

  async findByWallet(walletAddress: string) {
    return this.prisma.collaborator.findFirst({
      where: { walletAddress },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}
