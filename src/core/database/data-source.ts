import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config({ quiet: true });

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '')
    throw new TypeError(`Configuration key "${key}" is required (set in .env)`);
  return value;
}

const host = getEnv('DB_HOST');
const port = parseInt(process.env.DB_PORT ?? '', 10) || 5432;
const username = getEnv('DB_USER');
const password = getEnv('DB_PASSWORD');
const database = getEnv('DB_NAME');
const schema = process.env.DB_SCHEMA ?? 'public';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  schema,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/core/database/migrations/*.js'],
  migrationsTableName: 'migrations',
  migrationsRun: false,
  synchronize: false,
  logging: process.env.ENV !== 'production',
  extra: {
    connectionLimit: 10,
  },
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
