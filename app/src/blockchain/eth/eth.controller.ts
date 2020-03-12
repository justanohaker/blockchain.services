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
            address: "0x0Dd0C25B0a56564327aE70f0aeD805024084c35F",
            amount: "1000000",
            feePriority: FeePriority.NORMAL
        });
        this.logger.log(`test transfer {${JSON.stringify(res4)}}`);
        return respSuccess(res);

    }
    /*  @Post('balance')
      async balance(@Body() body: balanceDto) {
          this.logger.log(`balance {${JSON.stringify(body)}}`);
          // try {
              const res = await this.ethService.balance(body.address);
              return respSuccess(res);
          // } catch (error) {
          //     this.logger.log(error); 
          //     return respFailure(
          //         RespErrorCode.INTERNAL_SERVER_ERROR,
          //         `${error}`
          //     );
          // }
      }
      @Post('sendTransaction')
      async sendTransaction(@Body() body: TransferDef) {
          this.logger.log(`sendTransaction {${JSON.stringify(body)}}`);
          // try {
              const res = await this.ethService.transfer(body);
              return respSuccess(res);
          // } catch (error) {
          //     this.logger.log(error); 
          //     return respFailure(
          //         RespErrorCode.INTERNAL_SERVER_ERROR,
          //         `${error}`
          //     );
          // }
      }
      @Post('getTransaction')
      async getTransaction(@Body() body: transactionDto) {
          this.logger.log(`sendTransaction {${JSON.stringify(body)}}`);
          // try {
              const res = await this.ethService.getTransaction(body);
              return respSuccess(res);
          // } catch (error) {
          //     this.logger.log(error); 
          //     return respFailure(
          //         RespErrorCode.INTERNAL_SERVER_ERROR,
          //         `${error}`
          //     );
          // }
      }
  */
}
