import { IsString, IsNumber, Min, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MintTokensDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsString()
  @IsUUID('4')
  userId: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'Employee of the Month reward' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'optional-token-id' })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  tokenId?: string;

  @ApiProperty({ example: 'unique-idempotency-key-123' })
  @IsString()
  idempotencyKey: string;
}
