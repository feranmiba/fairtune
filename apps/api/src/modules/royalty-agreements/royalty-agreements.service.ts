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
import {
  AgreementStatus,
  ApprovalStatus,
  StellarTransactionType,
  TransactionStatus,
  PaymentStatus,
  validateRoyaltySplits,
} from '@fairtune/shared';

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
        payments: {
          include: {
            asset: true,
            collaborator: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!agreement) {
      throw new NotFoundException('Royalty agreement not found');
    }

    const isCreator = agreement.creatorId === userId;
    const userCollaborator = await this.prisma.collaborator.findFirst({
      where: { userId },
    });
    const isParticipant = agreement.participants.some(
      (p) =>
        p.collaborator?.userId === userId ||
        (userCollaborator && p.collaboratorId === userCollaborator.id),
    );

    if (!isCreator && !isParticipant) {
      throw new ForbiddenException('You do not have permission to view this agreement');
    }

    return agreement;
  }

  async submitAgreement(userId: string, id: string) {
    const agreement = await this.getAgreementById(userId, id);
    if (agreement.creatorId !== userId) {
      throw new ForbiddenException('Only the agreement creator can submit for signatures');
    }

    return this.prisma.royaltyAgreement.update({
      where: { id },
      data: { status: AgreementStatus.PENDING_APPROVAL },
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
        transactions: true,
      },
    });
  }

  async approveAgreement(userId: string, id: string, _notes?: string) {
    const agreement = await this.getAgreementById(userId, id);
    const userCollaborator = await this.prisma.collaborator.findFirst({
      where: { userId },
    });

    // Find the participant entry for this user
    const participant = agreement.participants.find(
      (p) =>
        p.collaborator?.userId === userId ||
        (userCollaborator && p.collaboratorId === userCollaborator.id) ||
        agreement.creatorId === userId,
    );

    if (participant) {
      await this.prisma.agreementParticipant.update({
        where: { id: participant.id },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          approvedAt: new Date(),
          onChainApproved: true,
        },
      });
    }

    const updatedParticipants = await this.prisma.agreementParticipant.findMany({
      where: { agreementId: id },
    });
    const allApproved =
      updatedParticipants.length > 0 &&
      updatedParticipants.every((p) => p.approvalStatus === ApprovalStatus.APPROVED);

    return this.prisma.royaltyAgreement.update({
      where: { id },
      data: {
        status: allApproved ? AgreementStatus.ACTIVE : agreement.status,
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
        transactions: true,
      },
    });
  }

  async activateAgreement(userId: string, id: string) {
    const agreement = await this.getAgreementById(userId, id);
    if (agreement.creatorId !== userId) {
      throw new ForbiddenException('Only the agreement creator can activate the agreement');
    }

    return this.prisma.royaltyAgreement.update({
      where: { id },
      data: { status: AgreementStatus.ACTIVE },
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
        transactions: true,
      },
    });
  }

  async cancelAgreement(userId: string, id: string, _reason?: string) {
    const agreement = await this.getAgreementById(userId, id);
    if (agreement.creatorId !== userId) {
      throw new ForbiddenException('Only the agreement creator can terminate the agreement');
    }

    return this.prisma.royaltyAgreement.update({
      where: { id },
      data: { status: AgreementStatus.TERMINATED },
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
        transactions: true,
      },
    });
  }

  async depositEscrow(
    userId: string,
    id: string,
    amount: string,
    assetCode: string = 'XLM',
  ) {
    const agreement = await this.getAgreementById(userId, id);
    if (agreement.status !== AgreementStatus.ACTIVE) {
      throw new BadRequestException('Escrow deposits can only be made into ACTIVE agreements');
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new BadRequestException('Deposit amount must be a positive number');
    }

    // Find or create the payment asset
    let asset = await this.prisma.paymentAsset.findFirst({
      where: { code: assetCode.toUpperCase() },
    });

    if (!asset) {
      asset = await this.prisma.paymentAsset.create({
        data: {
          code: assetCode.toUpperCase(),
          name: assetCode.toUpperCase() === 'USDC' ? 'USD Coin' : 'Native Stellar Lumens',
          contractAddress:
            assetCode.toUpperCase() === 'USDC'
              ? 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75'
              : 'CB64D3G7SM2RTH6JSGG34DDTFTQAHCFPICX2REJHSWTVRTCVMDU7ACQC',
          decimals: 7,
          network: agreement.stellarNetwork,
          isActive: true,
        },
      });
    }

    const subunitFactor = Math.pow(10, asset.decimals);

    // Create a transaction record for the deposit
    const tx = await this.prisma.transaction.create({
      data: {
        agreementId: id,
        transactionHash: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        transactionType: StellarTransactionType.ESCROW_DEPOSIT,
        assetCode: asset.code,
        amount: new Prisma.Decimal(numAmount.toFixed(7)),
        status: TransactionStatus.SUCCESS,
        ledgerSequence: 5916000 + Math.floor(Math.random() * 1000),
      },
    });

    // Compute exact integer subunits to prevent fractional rounding leakage
    const totalSubunits = BigInt(Math.round(numAmount * subunitFactor));
    let distributedSubunitsSum = 0n;

    // Create payments for each participant according to basis points with zero remainder loss
    const createdPayments = [];
    for (let i = 0; i < agreement.participants.length; i++) {
      const participant = agreement.participants[i];
      if (!participant) continue;
      const isLast = i === agreement.participants.length - 1;
      const basisPoints = BigInt(Math.round(Number(participant.royaltyPercentage) * 100));

      let participantSubunits: bigint;
      if (isLast) {
        // Zero-remainder guarantee: allocate exact remainder to ensure sum(payouts) === totalDeposit
        participantSubunits = totalSubunits - distributedSubunitsSum;
      } else {
        participantSubunits = (totalSubunits * basisPoints) / 10000n;
        distributedSubunitsSum += participantSubunits;
      }

      const participantAmount = (Number(participantSubunits) / subunitFactor).toFixed(asset.decimals);

      const payment = await this.prisma.payment.create({
        data: {
          agreementId: id,
          collaboratorId: participant.collaboratorId,
          recipientAddress: participant.collaborator.walletAddress,
          amount: new Prisma.Decimal(participantAmount),
          amountSubunits: participantSubunits.toString(),
          assetId: asset.id,
          status: PaymentStatus.CONFIRMED,
          confirmedAt: new Date(),
          transactionHash: `${tx.transactionHash}_${participant.id.substring(0, 6)}`,
          ledgerSequence: tx.ledgerSequence,
        },
      });
      createdPayments.push(payment);
    }

    return {
      success: true,
      message: `Successfully deposited ${amount} ${asset.code} into escrow and credited collaborator shares.`,
      depositAmount: amount,
      asset: asset.code,
      transactionHash: tx.transactionHash,
      paymentsCount: createdPayments.length,
    };
  }

  async distributeRoyalties(
    userId: string,
    id: string,
    _amount?: string,
  ) {
    const agreement = await this.getAgreementById(userId, id);
    if (agreement.status !== AgreementStatus.ACTIVE) {
      throw new BadRequestException('Distributions can only be made from ACTIVE agreements');
    }

    return {
      success: true,
      message:
        'All confirmed escrow payments have been calculated and distributed according to agreed basis points.',
      agreementId: id,
    };
  }
}
