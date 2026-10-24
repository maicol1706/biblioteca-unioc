import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { PERMISSIONS_KEY } from "./decorators";
import { AuthUser } from "./types";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = AuthUser>(err: Error, user: TUser) {
    if (err || !user) {
      throw err || new UnauthorizedException("Token inválido o sesión expirada");
    }
    return user;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user) throw new UnauthorizedException();
    const ok = required.every((permission) => user.permissions.includes(permission));
    if (!ok) {
      throw new ForbiddenException("No tienes permiso para esta operación");
    }
    return true;
  }
}
