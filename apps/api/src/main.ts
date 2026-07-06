import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: config.get<string>("WEB_ORIGIN")?.split(",") ?? "*",
    credentials: true,
  });

  const port = config.get<number>("PORT") ?? 3000;
  // Bind to 0.0.0.0 so cloud hosts (Render) can route traffic to the container.
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`WordUp API running on port ${port}`);
}
bootstrap();
