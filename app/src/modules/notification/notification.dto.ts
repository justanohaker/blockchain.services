import { ApiProperty } from '@nestjs/swagger';
import { IsString } from "class-validator";
import { ResponseBase } from '../../libs/responseHelper';

export class AddWebHookDto {
    @ApiProperty({
        description: '用于获取通知的WebAPI(POST|PUT)',
        example: 'http://localhost:8888/webhook'
    })
    @IsString()
    url: string;
}

export class IdParam {
    @ApiProperty({
        description: '待操作的数据的Id信息',
        example: 'dataId'
    })
    @IsString()
    id: string;
}

export class AddRespDto extends ResponseBase {
    id?: string;
}

export class ListRespDto extends ResponseBase {
    ids?: string[];
}

export class GetRespDto extends ResponseBase {
    id?: string;
    postUrl?: string;
}

export class DelRespDto extends ResponseBase {

}