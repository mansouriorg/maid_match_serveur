import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { Throttle } from '@nestjs/throttler';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST http://localhost:3000/auth/login
  // Public. At most 5 attempts every 60 seconds (anti brute force).
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // POST http://localhost:3000/auth/register-admin
  // Needs an admin token: only a logged-in admin can create another admin.
  @Post('register-admin')
  register(@Body() loginDto: RegisterAdminDto) {
    return this.authService.registerAdmin(loginDto);
  }
}
