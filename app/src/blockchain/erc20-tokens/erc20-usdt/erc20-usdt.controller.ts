import { Controller, Get, Query, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Erc20UsdtService } from './erc20-usdt.service';
import { respSuccess, respFailure, RespErrorCode } from 'src/libs/responseHelper';
import { FeePriority } from 'src/libs/types';
@Controller('erc20-usdt')
export class Erc20UsdtController {

    private logger: Logger = new Logger('Logger', true);
    constructor(
        private readonly usdtService: Erc20UsdtService
    ) { }

    @ApiOperation({
        summary: '测试(用户不要调用)',
        description: '测试，用户不要调用'
    })
    @Post('test')
    async test() {

        let res = await this.usdtService.balance("0xC4100A97dD815626E57A13886650060F914cc782"
        );
        this.logger.log(`test balance {${JSON.stringify(res)}}`);

        // let res2 = await this.ethService.getBalance(["0xC4100A97dD815626E57A13886650060F914cc782","0x0Dd0C25B0a56564327aE70f0aeD805024084c35F"]);
        // this.logger.log(`test getBalance {${JSON.stringify(res2)}}`);
        let res3 = await this.usdtService.getTransaction( "0xbda369c119c4b9db2606f8f0770b34104460f5dca3501765a4194b4098727c34" );
        this.logger.log(`test getTransaction {${JSON.stringify(res3)}}`);
        // let res4 = await this.usdtService.transfer({
        //     keyPair: {
        //         privateKey: "0x7f870ce4ebf900e040cce32976bf2239db878cb94885f50c780cfa2cf37659ed",
        //         wif: '',
        //         address: "0xC4100A97dD815626E57A13886650060F914cc782"
        //     },
        //     address: "0x4D3240d19A218C6A9c95a71891bA57037c1D73AD",
        //     amount: "1000000",
        //     feePriority: FeePriority.NORMAL
        // });
        // this.logger.log(`test transfer {${JSON.stringify(res4)}}`);

        let res5 = await this.usdtService.transferWithFee({
            keyPair: {
                privateKey: "0x7f870ce4ebf900e040cce32976bf2239db878cb94885f50c780cfa2cf37659ed",
                wif: '',
                address: "0xC4100A97dD815626E57A13886650060F914cc782"
            },
            address: "0xC64f9F5C2fBe9153ED9B414Ebc6a5A47e989c31C",
            amount: "1000000",
            fee: "100000000"
        });
        this.logger.log(`test transfer {${JSON.stringify(res5)}}`);
        return respSuccess(res);

    }
}
