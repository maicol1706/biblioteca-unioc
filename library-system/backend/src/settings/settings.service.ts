import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  }

  async update(key: string, value: unknown, userId: string) {
    const existing = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException("Parámetro no encontrado");
    return this.prisma.systemSetting.update({
      where: { key },
      data: { value: value as object, updatedById: userId },
    });
  }

  q10Status() {
    return {
      identityProvider: process.env.IDENTITY_PROVIDER || "local",
      configured: Boolean(process.env.Q10_BASE_URL && process.env.Q10_API_KEY),
      baseUrl: process.env.Q10_BASE_URL || null,
      message:
        "Q10 permanece desconectado hasta que exista documentación oficial. No hay endpoints inventados.",
    };
  }
}
