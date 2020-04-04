import { Controller, Get, Query, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NewWalletDto, balanceDto, sendCoinDto, transactionDto, TransferDef } from './eth.dto';
import { EthService } from './eth.service';
import { respSuccess, respFailure, RespErrorCode } from 'src/libs/responseHelper';
import { FeePriority } from 'src/libs/types';

@ApiTags("ethereum")
@Controller('eth')
export class EthController {
    private logger: Logger = new Logger('Logger', true);
    constructor(
        private readonly ethService: EthService
    ) { }

    @ApiOperation({
        summary: '测试(用户不要调用)',
        description: '测试，用户不要调用'
    })
    @Post('test')
    async test(@Body() body: NewWalletDto) {

        let res = await this.ethService.balance("0xC4100A97dD815626E57A13886650060F914cc782"
        );
        this.logger.log(`test balance {${JSON.stringify(res)}}`);

        // let res2 = await this.ethService.getBalance(["0xC4100A97dD815626E57A13886650060F914cc782","0x0Dd0C25B0a56564327aE70f0aeD805024084c35F"]);
        // this.logger.log(`test getBalance {${JSON.stringify(res2)}}`);
        let res3 = await this.ethService.getTransaction({ transactionId: "0x4c2ea13b79bb26f8ee0c43da1aad43c9c7ad6c42394b6d5cf7c84dddebb5f5d8" });
        this.logger.log(`test getTransaction {${JSON.stringify(res3)}}`);
        let res4 = await this.ethService.transfer({
            keyPair: {
                privateKey: "0x7f870ce4ebf900e040cce32976bf2239db878cb94885f50c780cfa2cf37659ed",
                wif: '',
                address: "0xC4100A97dD815626E57A13886650060F914cc782"
            },
            address: "0xC64f9F5C2fBe9153ED9B414Ebc6a5A47e989c31C",
            amount: "100000000000000",
            feePriority: FeePriority.NORMAL
        });
        this.logger.log(`test transfer {${JSON.stringify(res4)}}`);

        // let res5 = await this.ethService.transferWithFee({
        //     keyPair: {
        //         privateKey: "0x0bbbd483ad36f06425c359ac2f602d3c527131b1bb066cb342f9cacdf3e4532c",
        //         wif: '',
        //         address: "0x0Dd0C25B0a56564327aE70f0aeD805024084c35F"
        //     },
        //     address: "0xC4100A97dD815626E57A13886650060F914cc782",
        //     amount: "1000000",
        //     fee: "60000000000"
        // });
        // this.logger.log(`test transfer {${JSON.stringify(res5)}}`);

        return respSuccess(res);

    }
  
}
