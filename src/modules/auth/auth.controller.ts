import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler'; // <-- 1. NOUVEL IMPORT

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST http://localhost:3000/auth/login
  // 🛡️ PROTECTION ANTI-BRUTEFORCE : Limité à 5 tentatives toutes les 60 secondes
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // POST http://localhost:3000/auth/register-admin
  // IMPORTANT: Delete or protect this endpoint after you create your first admin!
  @Post('register-admin')
  register(@Body() loginDto: LoginDto) {
    return this.authService.registerAdmin(loginDto);
  }
}