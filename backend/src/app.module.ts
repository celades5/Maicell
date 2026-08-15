import { join } from 'path';
import { existsSync } from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ComponentDefinitionsModule } from './component-definitions/component-definitions.module';
import { buildDatabaseConfig } from './config/database.config';
import { FlowsModule } from './flows/flows.module';

const publicPath = join(__dirname, '..', 'public');
const serveAngular = existsSync(publicPath);

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
    ...(serveAngular
      ? [
          ServeStaticModule.forRoot({
            rootPath: publicPath,
            exclude: ['/api/{*path}'],
          }),
        ]
      : []),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
