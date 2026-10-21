export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
};

export type JwtPayload = {
  sub: string;
  email: string;
  typ: "access" | "refresh";
};
