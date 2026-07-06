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
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`WordUp API running on http://localhost:${port}/api`);
}
bootstrap();
