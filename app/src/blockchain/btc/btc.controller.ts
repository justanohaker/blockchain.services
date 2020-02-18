import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags("bitcoin")
@Controller('btc')
export class BtcController { }
