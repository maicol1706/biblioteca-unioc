import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { ToolRunner } from "./tool-runner";
import { CatalogModule } from "../catalog/catalog.module";
import { CirculationModule } from "../circulation/circulation.module";
import { ReportsModule } from "../reports/reports.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [CatalogModule, CirculationModule, ReportsModule, UsersModule],
  controllers: [AiController],
  providers: [AiService, ToolRunner],
})
export class AiModule {}
