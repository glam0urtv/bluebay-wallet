import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QRTransferDto {
  @ApiProperty({ description: 'QR session token' })
  @IsString()
  sessionToken: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;
}
