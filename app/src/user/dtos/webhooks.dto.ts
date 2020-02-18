import { ApiProperty } from "@nestjs/swagger";

export class AddWebHooksDto {
    @ApiProperty()
    url: string;
}