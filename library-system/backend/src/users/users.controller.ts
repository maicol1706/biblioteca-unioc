import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { IsBoolean } from "class-validator";
import { UsersService } from "./users.service";
import { JwtAuthGuard, PermissionsGuard } from "../common/guards";
import { RequirePermissions } from "../common/decorators";

class ActiveDto {
  @IsBoolean()
  isActive: boolean;
}

@Controller("users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions("users.read")
  list() {
    return this.users.list();
  }

  @Patch(":id/active")
  @RequirePermissions("users.manage")
  setActive(@Param("id") id: string, @Body() body: ActiveDto) {
    return this.users.setActive(id, body.isActive);
  }
}
