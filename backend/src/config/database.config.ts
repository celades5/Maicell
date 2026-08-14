import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const buildDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: config.get<number>('DB_PORT', 8080),
  username: config.get<string>('DB_USERNAME', 'test'),
  password: config.get<string>('DB_PASSWORD', 'test'),
  database: config.get<string>('DB_DATABASE', 'MaicellDB'),
  autoLoadEntities: true,
  synchronize: config.get<string>('NODE_ENV') !== 'production',
});
