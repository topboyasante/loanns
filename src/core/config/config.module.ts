import { Global, Module } from '@nestjs/common';
import {
  ConfigService,
  ConfigModule as NestDefaultConfigModule,
} from '@nestjs/config';
import config from '@/core/config/config';

@Global()
@Module({
  imports: [
    NestDefaultConfigModule.forRoot({
      load: [config],
      isGlobal: true,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
