import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  categories() {
    return this.prisma.category.findMany({ orderBy: { name: "asc" } });
  }

  async listBooks(query?: string, categorySlug?: string) {
    const where: Prisma.BookWhereInput = { isActive: true };
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { isbn: { contains: query, mode: "insensitive" } },
        { authors: { some: { author: { fullName: { contains: query, mode: "insensitive" } } } } },
      ];
    }
    if (categorySlug) {
      where.category = { slug: categorySlug };
    }
    const books = await this.prisma.book.findMany({
      where,
      orderBy: { title: "asc" },
      include: {
        publisher: true,
        category: true,
        authors: { include: { author: true }, orderBy: { position: "asc" } },
        copies: true,
      },
    });
    return books.map((book) => this.withAvailability(book));
  }

  async getBook(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        publisher: true,
        category: true,
        authors: { include: { author: true }, orderBy: { position: "asc" } },
        copies: { orderBy: { copyCode: "asc" } },
      },
    });
    if (!book) throw new NotFoundException("Libro no encontrado");
    return this.withAvailability(book);
  }

  async createBook(data: {
    isbn?: string;
    title: string;
    subtitle?: string;
    description?: string;
    publicationYear?: number;
    edition?: string;
    classificationCode?: string;
    physicalLocation?: string;
    publisherId?: string;
    categoryId?: string;
  }) {
    return this.prisma.book.create({ data });
  }

  async updateBook(id: string, data: Prisma.BookUpdateInput) {
    await this.getBook(id);
    return this.prisma.book.update({ where: { id }, data });
  }

  async addCopy(bookId: string, copyCode: string, barcode: string) {
    await this.getBook(bookId);
    return this.prisma.copy.create({
      data: { bookId, copyCode, barcode, status: "AVAILABLE" },
    });
  }

  async updateCopy(id: string, status: any, notes?: string) {
    const copy = await this.prisma.copy.findUnique({ where: { id } });
    if (!copy) throw new NotFoundException("Ejemplar no encontrado");
    return this.prisma.copy.update({ where: { id }, data: { status, notes } });
  }

  private withAvailability(book: any) {
    const available = book.copies.filter((c: any) => c.status === "AVAILABLE").length;
    return {
      ...book,
      authors: book.authors.map((item: any) => item.author),
      availability: {
        total: book.copies.length,
        available,
        loaned: book.copies.filter((c: any) => c.status === "LOANED").length,
      },
    };
  }
}
