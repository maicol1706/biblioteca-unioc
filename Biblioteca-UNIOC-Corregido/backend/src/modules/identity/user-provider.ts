/**
 * Puerto de identidad académica.
 * Fase 1: solo el contrato.
 * Fase 3: LocalUserProvider con usuarios de prueba.
 * Fase 10: Q10UserProvider con la documentación oficial.
 *
 * PROHIBIDO: inventar endpoints, credenciales o payloads de Q10.
 */

export type AcademicKind = "STUDENT" | "TEACHER";

export interface AcademicIdentity {
  externalId: string;
  documentNumber?: string;
  studentCode?: string;
  email: string;
  fullName: string;
  kind: AcademicKind;
  program?: string;
  academicStatus?: string;
}

export interface UserProvider {
  findByInstitutionalEmail(email: string): Promise<AcademicIdentity | null>;
  findByStudentCode(code: string): Promise<AcademicIdentity | null>;
  isActive(identity: AcademicIdentity): Promise<boolean>;
}

export class NotConfiguredError extends Error {
  constructor(provider: string, detail: string) {
    super(`${provider} no está configurado: ${detail}`);
    this.name = "NotConfiguredError";
  }
}

export class LocalUserProvider implements UserProvider {
  async findByInstitutionalEmail(): Promise<AcademicIdentity | null> {
    return null;
  }

  async findByStudentCode(): Promise<AcademicIdentity | null> {
    return null;
  }

  async isActive(): Promise<boolean> {
    return false;
  }
}

export class Q10UserProvider implements UserProvider {
  async findByInstitutionalEmail(): Promise<AcademicIdentity | null> {
    throw new NotConfiguredError(
      "Q10UserProvider",
      "Esperando URL, autenticación y contrato oficiales. No hay endpoints inventados."
    );
  }

  async findByStudentCode(): Promise<AcademicIdentity | null> {
    throw new NotConfiguredError(
      "Q10UserProvider",
      "Esperando URL, autenticación y contrato oficiales. No hay endpoints inventados."
    );
  }

  async isActive(): Promise<boolean> {
    throw new NotConfiguredError(
      "Q10UserProvider",
      "Esperando URL, autenticación y contrato oficiales. No hay endpoints inventados."
    );
  }
}

export function createUserProvider(name: string | undefined): UserProvider {
  if (name === "q10") {
    return new Q10UserProvider();
  }
  return new LocalUserProvider();
}
