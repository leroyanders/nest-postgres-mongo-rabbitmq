import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TokenService } from './token.service';

@Module({
  providers: [TokenService, JwtAuthGuard],
  exports: [TokenService, JwtAuthGuard],
})
export class AuthModule {}
