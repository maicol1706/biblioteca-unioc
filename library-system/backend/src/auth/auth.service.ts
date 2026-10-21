import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        profile: true,
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Correo o contraseña inválidos");
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException("Correo o contraseña inválidos");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: { actorId: user.id, action: "LOGIN", entity: "user", entityId: user.id },
    });

    return this.issue(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || "replace_with_another_32_random_bytes",
      });
      if (payload.typ !== "refresh") throw new Error("bad typ");
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          profile: true,
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      });
      if (!user || !user.isActive) throw new UnauthorizedException();
      return this.issue(user);
    } catch {
      throw new UnauthorizedException("Refresh token inválido");
    }
  }

  private issue(user: any) {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, typ: "access" },
      {
        secret: process.env.JWT_SECRET || "replace_with_at_least_32_random_bytes",
        expiresIn: process.env.JWT_ACCESS_TTL || "15m",
      }
    );
    const refreshToken = this.jwt.sign(
      { sub: user.id, email: user.email, typ: "refresh" },
      {
        secret: process.env.JWT_REFRESH_SECRET || "replace_with_another_32_random_bytes",
        expiresIn: process.env.JWT_REFRESH_TTL || "7d",
      }
    );
    return {
      accessToken,
      refreshToken,
      user: this.publicUser(user),
    };
  }

  private publicUser(user: any) {
    const roles = user.roles.map((item: any) => item.role.code);
    const permissions = [
      ...new Set(user.roles.flatMap((item: any) => item.role.permissions.map((rp: any) => rp.permission.code))),
    ];
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      identitySource: user.identitySource,
      profile: user.profile,
      roles,
      permissions,
    };
  }
}
