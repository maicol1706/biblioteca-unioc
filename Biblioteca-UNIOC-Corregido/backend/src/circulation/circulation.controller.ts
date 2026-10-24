import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { CirculationService } from "./circulation.service";
import { JwtAuthGuard, PermissionsGuard } from "../common/guards";
import { CurrentUser, RequirePermissions } from "../common/decorators";
import { AuthUser } from "../common/types";

class BookRefDto {
  @IsString()
  bookId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class ApproveDto {
  @IsOptional()
  @IsString()
  copyId?: string;
}

class NotesDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CirculationController {
  constructor(private readonly circulation: CirculationService) {}

  @Post("loan-requests")
  @RequirePermissions("loans.request")
  createRequest(@CurrentUser() user: AuthUser, @Body() body: BookRefDto) {
    return this.circulation.createRequest(user, body.bookId, body.notes);
  }

  @Get("loan-requests")
  listRequests(@CurrentUser() user: AuthUser) {
    return this.circulation.listRequests(user);
  }

  @Post("loan-requests/:id/approve")
  @RequirePermissions("loans.approve")
  approve(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: ApproveDto) {
    return this.circulation.approve(user, id, body.copyId);
  }

  @Post("loan-requests/:id/reject")
  @RequirePermissions("loans.approve")
  reject(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: NotesDto) {
    return this.circulation.reject(user, id, body.notes);
  }

  @Post("loan-requests/:id/cancel")
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.circulation.cancel(user, id);
  }

  @Get("loans")
  listLoans(@CurrentUser() user: AuthUser, @Query("mine") mine?: string) {
    return this.circulation.listLoans(user, mine === "1" || mine === "true");
  }

  @Post("loans/:id/return")
  @RequirePermissions("loans.return")
  returnLoan(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.circulation.returnLoan(user, id);
  }

  @Post("reservations")
  @RequirePermissions("reservations.create")
  reserve(@CurrentUser() user: AuthUser, @Body() body: BookRefDto) {
    return this.circulation.createReservation(user, body.bookId);
  }

  @Get("reservations")
  listReservations(@CurrentUser() user: AuthUser) {
    return this.circulation.listReservations(user);
  }

  @Post("reservations/:id/cancel")
  cancelReservation(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.circulation.cancelReservation(user, id);
  }

  @Post("jobs/process-reminders")
  @RequirePermissions("settings.manage")
  processReminders() {
    return this.circulation.processReminders();
  }
}
