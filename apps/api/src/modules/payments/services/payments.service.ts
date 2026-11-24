import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { QueryPaymentsInput, RecordPaymentInput } from '@fairtune/validation';
import { PaymentStatus, UserRole } from '@fairtune/shared';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotently records an individual collaborator payment for a royalty distribution.
   */
  async recordPayment(input: RecordPaymentInput) {
    const amountDecimal = new Prisma.Decimal(input.amount);
    this.logger.debug(
      `Recording payment for agreement ${input.agreementId} to ${input.recipientAddress}: ${input.amount}`,
    );

    if (input.transactionHash) {
      return this.prisma.payment.upsert({
        where: {
          transactionHash_recipientAddress: {
            transactionHash: input.transactionHash,
            recipientAddress: input.recipientAddress,
          },
        },
        create: {
          agreementId: input.agreementId,
          collaboratorId: input.collaboratorId || null,
          recipientAddress: input.recipientAddress,
          amount: amountDecimal,
          amountSubunits: input.amountSubunits,
          assetId: input.assetId,
          transactionHash: input.transactionHash,
          status: input.status || PaymentStatus.PENDING,
          ledgerSequence: input.ledgerSequence || null,
          confirmedAt: input.status === PaymentStatus.CONFIRMED ? new Date() : null,
        },
        update: {
          status: input.status || PaymentStatus.PENDING,
          ledgerSequence: input.ledgerSequence || undefined,
          confirmedAt: input.status === PaymentStatus.CONFIRMED ? new Date() : undefined,
        },
      });
    }

    return this.prisma.payment.create({
      data: {
        agreementId: input.agreementId,
        collaboratorId: input.collaboratorId || null,
        recipientAddress: input.recipientAddress,
        amount: amountDecimal,
        amountSubunits: input.amountSubunits,
        assetId: input.assetId,
        status: input.status || PaymentStatus.PENDING,
      },
    });
  }

  /**
   * Marks a payment confirmed with on-chain ledger proof.
   */
  async confirmPayment(transactionHash: string, recipientAddress: string, ledgerSequence?: number) {
    return this.prisma.payment.updateMany({
      where: {
        transactionHash,
        recipientAddress,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
      },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
        ledgerSequence: ledgerSequence || undefined,
      },
    });
  }

  /**
   * Marks a payment as failed with an explanatory reason.
   */
  async failPayment(transactionHash: string, recipientAddress: string, failureReason: string) {
    return this.prisma.payment.updateMany({
      where: {
        transactionHash,
        recipientAddress,
      },
      data: {
        status: PaymentStatus.FAILED,
        failureReason,
      },
    });
  }

  async getPaymentById(id: string, userId: string, role?: UserRole) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        agreement: {
          include: {
            creator: { select: { id: true, email: true } },
          },
        },
        collaborator: true,
        asset: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    if (role === UserRole.ADMIN) {
      return payment;
    }

    const isCreator = payment.agreement.creatorId === userId;
    const isRecipient = payment.collaborator?.userId === userId;

    if (!isCreator && !isRecipient) {
      throw new ForbiddenException('You do not have permission to view this payment record');
    }

    return payment;
  }

  async listPayments(query: QueryPaymentsInput, userId: string, role?: UserRole) {
    const { agreementId, collaboratorId, recipientAddress, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      ...(agreementId ? { agreementId } : {}),
      ...(collaboratorId ? { collaboratorId } : {}),
      ...(recipientAddress ? { recipientAddress } : {}),
      ...(status ? { status } : {}),
    };

    if (role !== UserRole.ADMIN) {
      where.OR = [{ agreement: { creatorId: userId } }, { collaborator: { userId } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: true,
          collaborator: true,
          agreement: {
            select: { id: true, title: true, trackName: true },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAgreementPayments(agreementId: string, userId: string, role?: UserRole) {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id: agreementId },
      include: {
        participants: { include: { collaborator: true } },
      },
    });

    if (!agreement) {
      throw new NotFoundException(`Royalty agreement ${agreementId} not found`);
    }

    if (role !== UserRole.ADMIN) {
      const isCreator = agreement.creatorId === userId;
      const isParticipant = agreement.participants.some((p) => p.collaborator.userId === userId);
      if (!isCreator && !isParticipant) {
        throw new ForbiddenException(
          'You do not have permission to view payments for this agreement',
        );
      }
    }

    return this.prisma.payment.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'desc' },
      include: {
        asset: true,
        collaborator: true,
      },
    });
  }

  async getCollaboratorPayments(collaboratorId: string, userId: string, role?: UserRole) {
    const collaborator = await this.prisma.collaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator) {
      throw new NotFoundException(`Collaborator ${collaboratorId} not found`);
    }

    if (role !== UserRole.ADMIN && collaborator.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view payments for this collaborator',
      );
    }

    return this.prisma.payment.findMany({
      where: { collaboratorId },
      orderBy: { createdAt: 'desc' },
      include: {
        asset: true,
        agreement: {
          select: { id: true, title: true, trackName: true },
        },
      },
    });
  }
}
