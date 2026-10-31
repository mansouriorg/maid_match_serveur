import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import * as xss from 'xss';

// What POST /auth/register-admin accepts: the same e-mail rules as the login
// form, and a stronger password (at least 12 characters, like the seed script).
export class RegisterAdminDto {
  @IsEmail({}, { message: "Format d'email invalide" })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? xss.filterXSS(value.trim().toLowerCase())
      : value,
  )
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @MinLength(12, {
    message: 'Le mot de passe doit faire au moins 12 caract\u00e8res',
  })
  password: string;
}
