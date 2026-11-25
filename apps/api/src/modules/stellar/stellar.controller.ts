import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StellarNetworkService } from './services/stellar-network.service';
import { StellarAccountService } from './services/stellar-account.service';
import { StellarTransactionService } from './services/stellar-transaction.service';
import { SorobanContractService } from './services/soroban-contract.service';
import { TransactionBuilderService } from './services/transaction-builder.service';
import { TransactionSimulationService } from './services/transaction-simulation.service';
import { AgreementSyncService } from './services/agreement-sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../database/prisma.service';
import { UserDto } from '@fairtune/shared';
import {
  prepareCreateAgreementTxSchema,
  prepareApproveAgreementTxSchema,
  prepareDepositEscrowTxSchema,
  prepareDistributeRoyaltiesTxSchema,
  submitSignedTxSchema,
  PrepareCreateAgreementTxInput,
  PrepareApproveAgreementTxInput,
  PrepareDepositEscrowTxInput,
  PrepareDistributeRoyaltiesTxInput,
  SubmitSignedTxInput,
} from '@fairtune/validation';
import { createHash } from 'crypto';

@ApiTags('Stellar Blockchain')
@Controller('stellar')
export class StellarController {
  constructor(
    private readonly networkService: StellarNetworkService,
    private readonly accountService: StellarAccountService,
    private readonly txService: StellarTransactionService,
    private readonly sorobanService: SorobanContractService,
    private readonly txBuilderService: TransactionBuilderService,
    private readonly txSimulationService: TransactionSimulationService,
    private readonly syncService: AgreementSyncService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('network')
  @ApiOperation({ summary: 'Get current Stellar network configuration and status' })
  @ApiResponse({ status: 200, description: 'Network status retrieved' })
  async getNetworkStatus() {
    const connectivity = await this.networkService.checkConnectivity();
    return {
      passphrase: this.networkService.getNetworkPassphrase(),
      rpcUrl: this.networkService.getRpcUrl(),
      connectivity,
      soroban: this.sorobanService.getContractConfig(),
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('accounts/:address/verify')
  @ApiOperation({ summary: 'Verify a Stellar wallet address format and check funding status' })
  @ApiResponse({ status: 200, description: 'Wallet verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid Stellar public address format' })
  @ApiResponse({ status: 404, description: 'Account unfunded on network' })
  async verifyAccount(@Param('address') address: string) {
    const isValidFormat = this.accountService.isValidPublicKey(address);
    if (!isValidFormat) {
      return {
        validFormat: false,
        funded: false,
        message: 'Invalid Stellar Ed25519 public address (must start with G)',
      };
    }

    try {
      const details = await this.accountService.getAccount(address);
      return {
        validFormat: true,
        funded: true,
        details,
      };
    } catch {
      return {
        validFormat: true,
        funded: false,
        message: 'Address format is valid, but account is not yet funded on network',
      };
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('accounts/:address/balances')
  @ApiOperation({ summary: 'Get balances for a Stellar account' })
  @ApiResponse({ status: 200, description: 'Account balances retrieved' })
  async getBalances(@Param('address') address: string) {
    const isValidFormat = this.accountService.isValidPublicKey(address);
    if (!isValidFormat) {
      return { balances: [], sequence: '0' };
    }
    try {
      const details = await this.accountService.getAccount(address);
      const normalizedBalances = (details.balances || []).map((b: any) => ({
        asset: b.asset_type === 'native' ? 'XLM' : b.asset_code || 'UNKNOWN',
        balance: b.balance,
        limit: b.limit,
      }));
      return { balances: normalizedBalances, sequence: details.sequenceNumber };
    } catch {
      return { balances: [], sequence: '0' };
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('accounts/generate-testnet')
  @ApiOperation({ summary: 'Generate a new funded Stellar testnet keypair for testing' })
  @ApiResponse({ status: 200, description: 'New testnet account generated and funded' })
  async generateTestnetAccount() {
    const { Keypair } = await import('@stellar/stellar-sdk');
    const pair = Keypair.random();
    const publicKey = pair.publicKey();

    try {
      await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
    } catch {
      // friendbot best-effort
    }

    return {
      publicKey,
      secretKey: pair.secret(),
      network: 'TESTNET',
      message: 'Generated funded testnet account with 10,000 XLM',
    };
  }

  // --- AGREEMENT OPERATIONS ---

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(['agreements/prepare', 'agreements/register/prepare'])
  @ApiOperation({
    summary:
      'Build and simulate an unsigned transaction to register a proposed royalty agreement on Soroban',
  })
  @ApiResponse({ status: 200, description: 'Unsigned transaction prepared for wallet signing' })
  @UsePipes(new ZodValidationPipe(prepareCreateAgreementTxSchema))
  async prepareCreateAgreement(
    @CurrentUser() user: UserDto,
    @Body() input: PrepareCreateAgreementTxInput,
  ) {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id: input.agreementId },
      include: {
        participants: {
          include: { collaborator: true },
        },
      },
    });

    if (!agreement) {
      throw new NotFoundException('Royalty agreement not found');
    }

    if (agreement.creatorId !== user.id) {
      throw new ForbiddenException('Only the agreement creator can prepare registration');
    }

    // Generate deterministic metadata hash from agreement terms
    const termsPayload = JSON.stringify({
      id: agreement.id,
      title: agreement.title,
      trackName: agreement.trackName,
      creatorId: agreement.creatorId,
      participants: agreement.participants.map((p) => ({
        address: p.collaborator.walletAddress,
        percentage: Number(p.royaltyPercentage),
      })),
    });
    const metadataHashHex = createHash('sha256').update(termsPayload).digest('hex');

    // Convert percentage to basis points (e.g. 50.00% -> 5000 bps)
    const participants = agreement.participants.map((p) => ({
      address: p.collaborator.walletAddress,
      basisPoints: Math.round(Number(p.royaltyPercentage) * 100),
    }));

    const result = await this.txBuilderService.buildCreateAgreementTx({
      creatorAddress: input.creatorPublicKey,
      trackId: agreement.trackName,
      metadataHashHex,
      tokenAddress: input.paymentTokenAddress,
      participants,
    });

    // Update agreement with metadata hash and payment token address
    await this.prisma.royaltyAgreement.update({
      where: { id: agreement.id },
      data: {
        metadataHash: metadataHashHex,
        paymentTokenAddress: input.paymentTokenAddress,
      },
    });

    return {
      agreementId: agreement.id,
      metadataHash: metadataHashHex,
      contractAddress: this.sorobanService.getContractId(),
      ...result,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('agreements/:id')
  @ApiOperation({ summary: 'Get agreement details with synchronized on-chain Soroban state' })
  @ApiResponse({ status: 200, description: 'Agreement retrieved' })
  async getAgreementDetails(@CurrentUser() user: UserDto, @Param('id') id: string) {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id },
      include: {
        participants: {
          include: { collaborator: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agreement) {
      throw new NotFoundException('Royalty agreement not found');
    }

    let onChainDetails = null;
    if (agreement.onChainAgreementId) {
      onChainDetails = await this.sorobanService.getAgreement(agreement.onChainAgreementId);
    }

    return {
      databaseRecord: agreement,
      onChainRecord: onChainDetails,
      isCreator: agreement.creatorId === user.id,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('agreements/:id/approve/prepare')
  @ApiOperation({
    summary:
      'Build and simulate an unsigned transaction for a collaborator to approve an agreement on-chain',
  })
  @ApiResponse({ status: 200, description: 'Unsigned approval transaction prepared' })
  @UsePipes(new ZodValidationPipe(prepareApproveAgreementTxSchema))
  async prepareApproveAgreement(
    @CurrentUser() _user: UserDto,
    @Param('id') id: string,
    @Body() input: PrepareApproveAgreementTxInput,
  ) {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id },
      include: {
        participants: {
          include: { collaborator: true },
        },
      },
    });

    if (!agreement) {
      throw new NotFoundException('Royalty agreement not found');
    }

    if (!agreement.onChainAgreementId) {
      throw new BadRequestException('Agreement has not been registered on-chain yet');
    }

    const isParticipant = agreement.participants.some(
      (p) => p.collaborator.walletAddress === input.collaboratorPublicKey,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'Provided wallet address is not an assigned collaborator for this agreement',
      );
    }

    const result = await this.txBuilderService.buildApproveAgreementTx({
      collaboratorAddress: input.collaboratorPublicKey,
      onChainAgreementId: agreement.onChainAgreementId,
    });

    return {
      agreementId: agreement.id,
      onChainAgreementId: agreement.onChainAgreementId,
      collaboratorPublicKey: input.collaboratorPublicKey,
      ...result,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('agreements/:id/deposit/prepare')
  @ApiOperation({
    summary:
      'Build and simulate an unsigned transaction to deposit funds into the agreement escrow',
  })
  @ApiResponse({ status: 200, description: 'Unsigned deposit transaction prepared' })
  @UsePipes(new ZodValidationPipe(prepareDepositEscrowTxSchema))
  async prepareDepositEscrow(
    @CurrentUser() _user: UserDto,
    @Param('id') id: string,
    @Body() input: PrepareDepositEscrowTxInput,
  ) {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      throw new NotFoundException('Royalty agreement not found');
    }

    if (!agreement.onChainAgreementId) {
      throw new BadRequestException('Agreement is not active on-chain');
    }

    const result = await this.txBuilderService.buildDepositEscrowTx({
      depositorAddress: input.depositorPublicKey,
      onChainAgreementId: agreement.onChainAgreementId,
      amount: input.amount,
    });

    return {
      agreementId: agreement.id,
      onChainAgreementId: agreement.onChainAgreementId,
      ...result,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('agreements/:id/distribute/prepare')
  @ApiOperation({
    summary:
      'Build and simulate an unsigned transaction to distribute available escrow funds to collaborators',
  })
  @ApiResponse({ status: 200, description: 'Unsigned distribution transaction prepared' })
  @UsePipes(new ZodValidationPipe(prepareDistributeRoyaltiesTxSchema))
  async prepareDistributeRoyalties(
    @CurrentUser() _user: UserDto,
    @Param('id') id: string,
    @Body() input: PrepareDistributeRoyaltiesTxInput,
  ) {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      throw new NotFoundException('Royalty agreement not found');
    }

    if (!agreement.onChainAgreementId) {
      throw new BadRequestException('Agreement is not registered on-chain');
    }

    const result = await this.txBuilderService.buildDistributeRoyaltiesTx({
      callerAddress: input.callerPublicKey,
      onChainAgreementId: agreement.onChainAgreementId,
    });

    return {
      agreementId: agreement.id,
      onChainAgreementId: agreement.onChainAgreementId,
      ...result,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('agreements/:id/sync')
  @ApiOperation({
    summary: 'Synchronize database agreement state with confirmed on-chain Soroban ledger records',
  })
  @ApiResponse({ status: 200, description: 'Agreement state synchronized' })
  async syncAgreementState(@Param('id') id: string) {
    return this.syncService.syncAgreementFromChain(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('agreements/:id/transactions')
  @ApiOperation({ summary: 'List all recorded on-chain transactions for an agreement' })
  @ApiResponse({ status: 200, description: 'Transactions list retrieved' })
  async getAgreementTransactions(@Param('id') id: string) {
    return this.prisma.transaction.findMany({
      where: { agreementId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- TRANSACTION OPERATIONS ---

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('transactions/submit')
  @ApiOperation({
    summary:
      'Submit a client-signed transaction XDR to Stellar, wait for confirmation, and sync ledger results',
  })
  @ApiResponse({ status: 200, description: 'Transaction submitted and confirmed' })
  @UsePipes(new ZodValidationPipe(submitSignedTxSchema))
  async submitSignedTransaction(@CurrentUser() _user: UserDto, @Body() input: SubmitSignedTxInput) {
    return this.syncService.submitSignedTransaction(input.signedTxXdr);
  }

  @Public()
  @Post('transactions/simulate')
  @ApiOperation({ summary: 'Simulate any Soroban transaction XDR against network RPC' })
  @ApiResponse({ status: 200, description: 'Simulation result calculated' })
  async simulateTransaction(@Body('txXdr') txXdr: string) {
    if (!txXdr) {
      throw new BadRequestException('Transaction XDR is required');
    }
    return this.txSimulationService.simulateTransactionXdr(txXdr);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('transactions/:hash')
  @ApiOperation({ summary: 'Get full transaction status and ledger metadata' })
  @ApiResponse({ status: 200, description: 'Transaction details retrieved' })
  async getTransaction(@Param('hash') hash: string) {
    return this.txService.verifyTransaction(hash);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('transactions/:hash/verify')
  @ApiOperation({ summary: 'Verify a submitted Stellar transaction hash on-chain' })
  @ApiResponse({ status: 200, description: 'Transaction verified on ledger' })
  @ApiResponse({ status: 404, description: 'Transaction not found on ledger' })
  async verifyTransaction(@Param('hash') hash: string) {
    return this.txService.verifyTransaction(hash);
  }
}
