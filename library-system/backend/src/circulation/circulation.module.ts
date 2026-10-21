import { Module } from "@nestjs/common";
import { CirculationController } from "./circulation.controller";
import { CirculationService } from "./circulation.service";

@Module({
  controllers: [CirculationController],
  providers: [CirculationService],
  exports: [CirculationService],
})
export class CirculationModule {}
