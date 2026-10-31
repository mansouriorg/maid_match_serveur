import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import * as xss from 'xss';

export class LoginDto {
  @IsEmail({}, { message: "Format d'email invalide" })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  // 🛡️ SANITIZATION : On supprime les espaces inutiles, on met en minuscules, et on bloque le XSS
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      const cleanedEmail = value.trim().toLowerCase();
      return xss.filterXSS(cleanedEmail);
    }
    return value;
  })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @MinLength(6, { message: 'Le mot de passe doit faire au moins 6 caractères' })
  // 🔒 ATTENTION : On ne filtre JAMAIS un mot de passe avec XSS ou Trim.
  // Il sera sécurisé plus tard lors du hachage (bcrypt) dans le service !
  password: string;
}
