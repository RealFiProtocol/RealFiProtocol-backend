import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { TransactionStatus } from '@prisma/client';

export class CreateTransactionDto {
  @IsString()
  propertyId: string;

  amount: number;

  @IsOptional()
  @IsString()
  blockchainTxHash?: string;

  @IsOptional()
  @IsDateString()
  closingDate?: string;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  blockchainTxHash?: string;

  @IsOptional()
  @IsDateString()
  closingDate?: string;
}
