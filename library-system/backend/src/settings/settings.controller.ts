import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { JwtAuthGuard, PermissionsGuard } from "../common/guards";
import { CurrentUser, RequirePermissions } from "../common/decorators";
import { AuthUser } from "../common/types";

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get("settings")
  @RequirePermissions("settings.manage")
  list() {
    return this.settings.list();
  }

  @Patch("settings/:key")
  @RequirePermissions("settings.manage")
  update(@Param("key") key: string, @Body() body: { value: unknown }, @CurrentUser() user: AuthUser) {
    return this.settings.update(key, body.value, user.id);
  }

  @Get("q10/status")
  @RequirePermissions("q10.configure")
  status() {
    return this.settings.q10Status();
  }

  @Post("q10/sync")
  @RequirePermissions("q10.configure")
  sync() {
    return {
      ok: false,
      status: "NOT_CONFIGURED",
      message: "Q10 no se sincroniza sin contrato oficial. IDENTITY_PROVIDER=local.",
    };
  }
}
