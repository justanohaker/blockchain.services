import { ApiProperty } from "@nestjs/swagger";

export class AddWebHookDto {
    @ApiProperty()
    url: string;
}