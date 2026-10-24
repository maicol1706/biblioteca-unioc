import { Controller, Get, UseGuards } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard, PermissionsGuard } from "../common/guards";
import { RequirePermissions } from "../common/decorators";

@Controller("reports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("overview")
  @RequirePermissions("reports.read")
  overview() {
    return this.reports.overview();
  }
}
