import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CollaboratorsService } from '../collaborators/collaborators.service';
import { CreateRoyaltyAgreementInput } from '@fairtune/validation';
import { AgreementStatus, ApprovalStatus, validateRoyaltySplits } from '@fairtune/shared';

@Injectable()
export class RoyaltyAgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collaboratorsService: CollaboratorsService,
  ) {}

  async createAgreement(userId: string, input: CreateRoyaltyAgreementInput) {
    // Exact decimal validation
    const percentages = input.participants.map((p) => p.royaltyPercentage);
    const splitValidation = validateRoyaltySplits(percentages);

    if (!splitValidation.isValid) {
      throw new BadRequestException(
        `Royalty splits must sum to exactly 100.00%. Current total: ${splitValidation.total}% (difference: ${splitValidation.difference}%)`,
      );
    }

    // Resolve or create collaborators
    const participantData = await Promise.all(
      input.participants.map(async (p) => {
        const collaborator = await this.collaboratorsService.findOrCreate(
          p.displayName,
          p.walletAddress,
        );
        return {
          collaboratorId: collaborator.id,
          royaltyPercentage: new Prisma.Decimal(p.royaltyPercentage.toFixed(2)),
          approvalStatus: ApprovalStatus.PENDING,
        };
      }),
    );

    // Create the agreement in a database transaction
    return this.prisma.royaltyAgreement.create({
      data: {
        creatorId: userId,
        title: input.title,
        trackName: input.trackName,
        description: input.description,
        stellarNetwork: input.stellarNetwork,
        status: AgreementStatus.PENDING_APPROVAL,
        totalAllocation: new Prisma.Decimal('100.00'),
        participants: {
          create: participantData,
        },
      },
      include: {
        participants: {
          include: {
            collaborator: true,
          },
        },
        creator: {
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

  async listUserAgreements(userId: string) {
    return this.prisma.royaltyAgreement.findMany({
      where: {
        OR: [
          { creatorId: userId },
          {
            participants: {
              some: {
                collaborator: {
                  userId,
                },
              },
            },
          },
        ],
      },
      include: {
        participants: {
          include: {
            collaborator: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAgreementById(userId: string, id: string) {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        participants: {
          include: {
            collaborator: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agreement) {
      throw new NotFoundException('Royalty agreement not found');
    }

    const isCreator = agreement.creatorId === userId;
    const isParticipant = agreement.participants.some((p) => p.collaborator.userId === userId);

    if (!isCreator && !isParticipant) {
      throw new ForbiddenException('You do not have permission to view this agreement');
    }

    return agreement;
  }
}
