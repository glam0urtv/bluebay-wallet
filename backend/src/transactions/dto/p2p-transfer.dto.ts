import { IsString, IsNumber, Min, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class P2PTransferDto {
  @ApiProperty({ example: 'uuid-of-receiver' })
  @IsString()
  @IsUUID('4')
  receiverUserId: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'unique-idempotency-key' })
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional({ example: 'Lunch money' })
  @IsOptional()
  @IsString()
  note?: string;
}
