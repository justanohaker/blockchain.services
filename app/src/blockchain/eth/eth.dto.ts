import { ApiProperty } from '@nestjs/swagger';
export class BaseDto {
    
}
export class NewWalletDto extends BaseDto{
    @ApiProperty()
    name: string;//钱包名字
    @ApiProperty()
    url: string;//钱包webhook
}
export class balanceDto {
    @ApiProperty()
    address: string;
}
export class transactionDto extends BaseDto{
    @ApiProperty()
    transactionId: string;
}
export class sendCoinDto extends BaseDto{
    @ApiProperty()
    number: string;
    @ApiProperty()
    coinName: string;
    @ApiProperty()
    unit: string;
    @ApiProperty()
    toAddress: string;
    @ApiProperty()
    nonce: string;
}

export class AccountKeyPair {
    @ApiProperty()
    privateKey: string;     // 账号私钥(hex string)
    @ApiProperty()
    address: string;        // 账号地址
}

/**
 * 转账请求数据
 */
export class TransferDef {
    keyPair: AccountKeyPair;    // 转账sender
    @ApiProperty()
    address: string;            // 转账recipient
    @ApiProperty()
    amount: string;             // 转账金额:各平台的最小单位(sotasi)
}
