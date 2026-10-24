import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsOptional, IsString, MinLength } from "class-validator";
import { AiService } from "./ai.service";
import { JwtAuthGuard, PermissionsGuard } from "../common/guards";
import { CurrentUser, RequirePermissions } from "../common/decorators";
import { AuthUser } from "../common/types";

class ChatDto {
  @IsString()
  @MinLength(1)
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

@Controller("ai")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("chat")
  @RequirePermissions("ai.use")
  chat(@CurrentUser() user: AuthUser, @Body() body: ChatDto) {
    return this.ai.chat(user, body.message, body.conversationId);
  }

  @Get("conversations")
  @RequirePermissions("ai.use")
  history(@CurrentUser() user: AuthUser) {
    return this.ai.history(user);
  }
}
