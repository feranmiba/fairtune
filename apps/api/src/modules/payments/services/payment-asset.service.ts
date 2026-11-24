import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePaymentAssetInput, UpdatePaymentAssetInput } from '@fairtune/validation';
import { StellarNetwork } from '@fairtune/shared';

@Injectable()
export class PaymentAssetService {
  private readonly logger = new Logger(PaymentAssetService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAsset(input: CreatePaymentAssetInput) {
    const existing = await this.prisma.paymentAsset.findUnique({
      where: { contractAddress: input.contractAddress },
    });

    if (existing) {
      throw new ConflictException(
        `Payment asset with contract ${input.contractAddress} already exists`,
      );
    }

    const created = await this.prisma.paymentAsset.create({
      data: {
        code: input.code.toUpperCase(),
        name: input.name,
        contractAddress: input.contractAddress,
        issuerPublicKey: input.issuerPublicKey || null,
        decimals: input.decimals ?? 7,
        network: input.network || StellarNetwork.TESTNET,
        isActive: input.isActive ?? true,
      },
    });

    this.logger.log(`Registered payment asset ${created.code} (${created.contractAddress})`);
    return created;
  }

  async listAssets(network?: StellarNetwork, activeOnly = true) {
    return this.prisma.paymentAsset.findMany({
      where: {
        ...(network ? { network } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { code: 'asc' },
    });
  }

  async getAssetById(id: string) {
    const asset = await this.prisma.paymentAsset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException(`Payment asset with ID ${id} not found`);
    }

    return asset;
  }

  async getAssetByContract(contractAddress: string) {
    return this.prisma.paymentAsset.findUnique({
      where: { contractAddress },
    });
  }

  async updateAsset(id: string, input: UpdatePaymentAssetInput) {
    await this.getAssetById(id);

    return this.prisma.paymentAsset.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Converts a decimal amount string/number to base subunits (e.g. stroops).
   * Safe integer string manipulation without floating point math.
   */
  toSubunits(amount: number | string, decimals = 7): string {
    const str = String(amount).trim();
    if (!/^\d+(\.\d+)?$/.test(str)) {
      throw new Error(`Invalid decimal amount format: ${amount}`);
    }

    const [integerPart, fractionalPart = ''] = str.split('.');
    const paddedFraction = (fractionalPart + '0'.repeat(decimals)).slice(0, decimals);
    const combined = integerPart + paddedFraction;
    // Strip leading zeroes, but keep at least '0'
    const result = combined.replace(/^0+(?=\d)/, '');
    return result || '0';
  }

  /**
   * Converts base subunits string/bigint to a human-readable decimal string.
   */
  fromSubunits(subunits: string | bigint, decimals = 7): string {
    const str = String(subunits).replace(/^0+(?=\d)/, '') || '0';
    if (decimals === 0) return str;

    if (str.length <= decimals) {
      const padded = str.padStart(decimals, '0');
      const trimmed = padded.replace(/0+$/, '');
      return `0.${trimmed || '0'}`;
    }

    const intPart = str.slice(0, str.length - decimals);
    const fracPart = str.slice(str.length - decimals).replace(/0+$/, '');
    return fracPart ? `${intPart}.${fracPart}` : intPart;
  }
}
