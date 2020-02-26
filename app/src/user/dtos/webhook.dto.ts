import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUrl } from "class-validator";

export class AddWebHookDto {
    @ApiProperty({
        description: 'WebHook通知URL地址',
        example: '请输入你用于事件/消息通知的url地址，https://yoursever/notification'
    })
    @IsString()
    @IsUrl()
    url: string;
}