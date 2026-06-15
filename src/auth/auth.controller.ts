import { Body, Controller, Post } from '@nestjs/common';
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
}
