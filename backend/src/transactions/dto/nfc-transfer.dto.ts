import { IsString, IsNumber, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NFCTransferDto {
  @ApiProperty({ description: 'NFC session nonce' })
  @IsString()
  @MaxLength(64)
  nonce: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'ID of the receiver user/merchant' })
  @IsString()
  receiverUserId: string;
}
