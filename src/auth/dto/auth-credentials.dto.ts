import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** Shared body for register + login. */
export class AuthCredentialsDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt only hashes the first 72 bytes
  password!: string;
}
