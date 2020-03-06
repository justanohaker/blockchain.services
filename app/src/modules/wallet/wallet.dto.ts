import { ApiProperty } from "@nestjs/swagger";
import { IsNumberString, IsString, IsIn } from "class-validator";
import { ResponseBase } from "../../libs/responseHelper";
import { CoinType, FeePriority } from '../../libs/types';

// request
export class AddAccountDto {
    @ApiProperty({
        description: '设置新建账号的Id值',
        example: '1234567890'
    })
    @IsNumberString()
    accountId: string;
}

export class IdParam {
    @ApiProperty({
        description: '待操作数据的Id值',
        example: 'dataId'
    })
    @IsNumberString()
    id: string;
}

export class CoinParam extends IdParam {
    @ApiProperty({
        description: '区块链平台(Bitcoin, Ethereum)',
        example: CoinType.BITCOIN,
        enum: [CoinType.BITCOIN, CoinType.ETHEREUM]
    })
    @IsString()
    @IsIn([CoinType.BITCOIN, CoinType.ETHEREUM])
    coin: CoinType;
}

export class TxidParam extends CoinParam {
    @ApiProperty({
        description: '交易Id',
        example: 'txid'
    })
    @IsString()
    txid: string;
}

export class DespositDto {
    @ApiProperty({
        description: '提币目标地址',
        example: 'address for blockchain'
    })
    @IsString()
    address: string;

    @ApiProperty({
        description: '待提币金额 - 输入各平台最小单位(Satoshi, Gas)',
        example: '100000'
    })
    @IsString()
    amount: string;

    @ApiProperty({
        description: '提币交易费等级',
        example: FeePriority.NORMAL,
        enum: [FeePriority.HIGH, FeePriority.NORMAL, FeePriority.LOWER]
    })
    @IsString()
    @IsIn([FeePriority.HIGH, FeePriority.NORMAL, FeePriority.LOWER])
    feePriority: FeePriority;
}

// response
export class AddAccountRespDto extends ResponseBase {

}

export class ListAccountRespDto extends ResponseBase {
    accountIds?: string[];
}

export class AccountRespDto extends ResponseBase {
    accountId?: string;
    // TODO  
}

export class AddressRespDto extends ResponseBase {
    address?: string;
}

export class BalanceRespDto extends ResponseBase {
    balance?: string;
}

export class TransactionsRespDto extends ResponseBase {
    txids?: string[];
}

export class TransactionRespDto extends ResponseBase {
    data?: any;
}

export class DespositRespDto extends ResponseBase {
    txid?: string;
}