import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "../common/types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "replace_with_at_least_32_random_bytes",
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.typ !== "access") {
      throw new UnauthorizedException("Token de acceso requerido");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        profile: true,
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Usuario inactivo o inexistente");
    }
    const roles = user.roles.map((item) => item.role.code);
    const permissions = [
      ...new Set(user.roles.flatMap((item) => item.role.permissions.map((rp) => rp.permission.code))),
    ];
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };
  }
}
