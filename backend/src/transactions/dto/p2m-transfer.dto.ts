import { IsString, IsNumber, Min, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class P2MTransferDto {
  @ApiProperty({ example: 'uuid-of-merchant-user-id' })
  @IsString()
  @IsUUID('4')
  merchantUserId: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'unique-idempotency-key' })
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional({ example: 'Coffee purchase' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'uuid-of-token' })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  tokenId?: string;
}
