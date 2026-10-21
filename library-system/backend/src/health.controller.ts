import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("health")
  health() {
    return {
      ok: true,
      app: process.env.APP_NAME || "library-system",
      identityProvider: process.env.IDENTITY_PROVIDER || "local",
      q10Configured: Boolean(process.env.Q10_BASE_URL && process.env.Q10_API_KEY),
    };
  }
}
