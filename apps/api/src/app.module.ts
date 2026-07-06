import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health/health.controller";
import { UsersModule } from "./users/users.module";
import { ProgressModule } from "./progress/progress.module";
import { StatsModule } from "./stats/stats.module";
import { GamificationModule } from "./gamification/gamification.module";
import { AuthModule } from "./auth/auth.module";
import { ContentModule } from "./content/content.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProgressModule,
    StatsModule,
    GamificationModule,
    ContentModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
