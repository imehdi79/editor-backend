import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { JwtPayload } from './auth.types';

export interface AuthResult {
  token: string;
  user: { id: string; email: string };
}

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: AuthCredentialsDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email, password },
    });

    return this.issue(user.id, user.email);
  }

  private issue(id: string, email: string): AuthResult {
    const payload: JwtPayload = { sub: id, email };
    return { token: this.jwt.sign(payload), user: { id, email } };
  }
}
