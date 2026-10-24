import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CirculationModule } from "./circulation/circulation.module";
import { UsersModule } from "./users/users.module";
import { ReportsModule } from "./reports/reports.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SettingsModule } from "./settings/settings.module";
import { AiModule } from "./ai/ai.module";
import { ImportsModule } from "./imports/imports.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CatalogModule,
    CirculationModule,
    UsersModule,
    ReportsModule,
    NotificationsModule,
    SettingsModule,
    AiModule,
    ImportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
