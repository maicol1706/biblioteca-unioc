import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImportsService } from "./imports.service";
import { JwtAuthGuard, PermissionsGuard } from "../common/guards";
import { CurrentUser, RequirePermissions } from "../common/decorators";
import { AuthUser } from "../common/types";

type Upload = { buffer: Buffer; originalname: string; size: number };

@Controller("imports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Get("templates/users.csv")
  @RequirePermissions("users.manage")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", "attachment; filename=\"plantilla-usuarios-q10.csv\"")
  usersTemplate() {
    return this.imports.userTemplate();
  }

  @Get("templates/catalog.csv")
  @RequirePermissions("books.write")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", "attachment; filename=\"plantilla-catalogo.csv\"")
  catalogTemplate() {
    return this.imports.catalogTemplate();
  }

  @Get("history")
  @RequirePermissions("q10.configure")
  history() {
    return this.imports.history();
  }

  @Post("users")
  @RequirePermissions("users.manage")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  importUsers(
    @UploadedFile() file: Upload,
    @CurrentUser() user: AuthUser,
    @Query("source") source?: string,
  ) {
    if (!file?.buffer) throw new BadRequestException("Adjunta un archivo CSV en el campo file");
    const fromQ10 = source === "q10" || source === "Q10_FILE";
    return this.imports.importUsers(file.buffer, file.originalname || "usuarios.csv", user.id, fromQ10 ? "Q10_FILE" : "FILE");
  }

  @Post("catalog")
  @RequirePermissions("books.write")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  importCatalog(@UploadedFile() file: Upload, @CurrentUser() user: AuthUser) {
    if (!file?.buffer) throw new BadRequestException("Adjunta un archivo CSV en el campo file");
    return this.imports.importCatalog(file.buffer, file.originalname || "catalogo.csv", user.id);
  }
}
