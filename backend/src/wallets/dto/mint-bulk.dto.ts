import { IsArray, ValidateNested, IsNumber, Min, IsString, IsUUID, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BulkRecipient {
  @ApiProperty()
  @IsString()
  @IsUUID('4')
  userId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class MintBulkDto {
  @ApiProperty({ type: [BulkRecipient] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkRecipient)
  recipients: BulkRecipient[];

  @ApiPropertyOptional({ example: 'optional-token-id' })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  tokenId?: string;
}
