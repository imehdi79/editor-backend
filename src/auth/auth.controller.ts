import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthResult, AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';

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
}
