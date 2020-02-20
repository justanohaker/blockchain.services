import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUrl } from "class-validator";

export class AddWebHookDto {
    @ApiProperty()
    @IsString()
    @IsUrl()
    url: string;
}