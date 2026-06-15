import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthResult, AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/register → 201 { token, user } (auto-login). */
  @Post('register')
  register(@Body() dto: AuthCredentialsDto): Promise<AuthResult> {
    return this.auth.register(dto);
  }

  /** POST /auth/login → 200 { token, user }. */
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: AuthCredentialsDto): Promise<AuthResult> {
    return this.auth.login(dto);
  }

  /** GET /auth/me → 200 { userId, email } (current token's user). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
