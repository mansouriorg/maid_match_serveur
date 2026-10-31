import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 1. Validate User Credentials
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find admin by email
    const admin = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password (compare plain text vs hashed)
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Generate JWT Token
    const payload = { sub: admin.id, email: admin.email };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // Helper to create the very first admin (Call this manually once)
  async registerAdmin(loginDto: LoginDto) {
    const hashedPassword = await bcrypt.hash(loginDto.password, 10);
    return this.prisma.admin.create({
      data: {
        email: loginDto.email,
        password: hashedPassword,
      },
    });
  }
}
