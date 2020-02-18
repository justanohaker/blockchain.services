import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags("ethereum")
@Controller('eth')
export class EthController { }
