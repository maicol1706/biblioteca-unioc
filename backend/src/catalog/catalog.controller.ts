import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { CatalogService } from "./catalog.service";
import { JwtAuthGuard, PermissionsGuard } from "../common/guards";
import { RequirePermissions } from "../common/decorators";

class BookWriteDto {
  @IsOptional()
  @IsString()
  isbn?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  publicationYear?: number;

  @IsOptional()
  @IsString()
  edition?: string;

  @IsOptional()
  @IsString()
  classificationCode?: string;

  @IsOptional()
  @IsString()
  physicalLocation?: string;

  @IsOptional()
  @IsString()
  publisherId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

class CopyDto {
  @IsString()
  bookId: string;

  @IsString()
  copyCode: string;

  @IsString()
  barcode: string;
}

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("categories")
  @RequirePermissions("catalog.read")
  categories() {
    return this.catalog.categories();
  }

  @Get("books")
  @RequirePermissions("catalog.read")
  list(@Query("q") q?: string, @Query("category") category?: string) {
    return this.catalog.listBooks(q, category);
  }

  @Get("books/:id")
  @RequirePermissions("catalog.read")
  one(@Param("id") id: string) {
    return this.catalog.getBook(id);
  }

  @Post("books")
  @RequirePermissions("books.write")
  create(@Body() body: BookWriteDto) {
    return this.catalog.createBook(body);
  }

  @Patch("books/:id")
  @RequirePermissions("books.write")
  update(@Param("id") id: string, @Body() body: Partial<BookWriteDto>) {
    return this.catalog.updateBook(id, body);
  }

  @Post("copies")
  @RequirePermissions("copies.write")
  addCopy(@Body() body: CopyDto) {
    return this.catalog.addCopy(body.bookId, body.copyCode, body.barcode);
  }
}
