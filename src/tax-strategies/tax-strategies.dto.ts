import { IsOptional, IsString } from 'class-validator';

export class CreateTaxStrategyDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  disclaimer?: string;
}

export class UpdateTaxStrategyDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  disclaimer?: string;
}
