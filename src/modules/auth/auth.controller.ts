import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST http://localhost:3000/auth/login
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