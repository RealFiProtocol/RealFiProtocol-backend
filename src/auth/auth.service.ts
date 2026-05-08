import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto, RegisterDto, RequestPasswordResetDto, ResetPasswordDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email already in use');

    const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
    const hashed = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, firstName: dto.firstName, lastName: dto.lastName },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    return { user, accessToken: this.sign(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Invalid credentials');
    if (user.isBlocked) throw new UnauthorizedException('Account is blocked');

    const { password, ...safe } = user;
    return { user: safe, accessToken: this.sign(safe) };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Silently succeed if user not found or blocked (security)
    if (!user || user.isBlocked) return { message: 'If the email exists, a reset link was sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    // In production, send email here. For now, return token in response (dev only).
    return { message: 'If the email exists, a reset link was sent.', devToken: token };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiry: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const limit = parseInt(process.env.PASSWORD_HISTORY_LIMIT ?? '5', 10);
    for (const old of user.passwordHistory.slice(-limit)) {
      if (await bcrypt.compare(dto.newPassword, old))
        throw new BadRequestException('Cannot reuse a recent password');
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
    const hashed = await bcrypt.hash(dto.newPassword, rounds);
    const history = [...user.passwordHistory, user.password].slice(-limit);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, passwordHistory: history, passwordResetToken: null, passwordResetExpiry: null },
    });

    return { message: 'Password updated successfully' };
  }

  private sign(user: { id: string; email: string; role: string }) {
    return this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
  }
}
