import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ComponentDefinitionsModule } from './component-definitions/component-definitions.module';
import { buildDatabaseConfig } from './config/database.config';
import { FlowsModule } from './flows/flows.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildDatabaseConfig,
    }),
    ComponentDefinitionsModule,
    FlowsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
