import { Body, Param, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { Role } from "src/common/enums/role.enum";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
    constructor(private service: UsersService) { }

    @Roles(Role.ADMIN)
    @Get()
    getAllUsers() {
        return this.service.getAllUsers()
    }

    @Roles(Role.ADMIN)
    @Get(':email')
    findByEmail(@Param() email: string) {
        return this.service.findByEmail(email)
    }

    @Roles(Role.ADMIN || Role.USER)
    @Post('new')
    create(@Body() body: any) {
        return this.service.create(body)
    }
}