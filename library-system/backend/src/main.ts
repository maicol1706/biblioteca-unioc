import "reflect-metadata";
import "./load-env";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configured = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed =
        origin === configured ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".github.dev") ||
        origin.endsWith(".app.github.dev");
      return callback(allowed ? null : new Error("CORS"), allowed);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  const port = Number(process.env.APP_PORT || 3001);
  await app.listen(port);
  console.log(`API lista en http://localhost:${port}`);
}

bootstrap();
