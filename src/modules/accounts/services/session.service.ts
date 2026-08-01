import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { AppConfig } from '../../../config/types/app-config';
import { PrismaService } from '../../../database/services/prisma.service';
import { SessionContext } from '../types/session-context';

const TTL_PATTERN = /^(\d+)(s|m|h|d)$/;
const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

@Injectable()
export class SessionService {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService<AppConfig, true>,
  ) {
    this.refreshTtlMs = this.parseTtl(
      configService.get('jwt.refreshExpiresIn', { infer: true }),
    );
  }

  async issue(accountId: string, context: SessionContext): Promise<string> {
    const refreshToken = randomBytes(48).toString('base64url');

    await this.prisma.session.create({
      select: { id: true },
      data: {
        accountId,
        refreshTokenHash: this.hash(refreshToken),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
      },
    });

    return refreshToken;
  }

  async rotate(
    refreshToken: string,
    context: SessionContext,
  ): Promise<{ accountId: string; refreshToken: string }> {
    const session = await this.prisma.session.findUnique({
      select: { id: true, accountId: true, expiresAt: true, revokedAt: true },
      where: { refreshTokenHash: this.hash(refreshToken) },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Conditional update guards against two concurrent refreshes both
    // rotating the same session: only the first one wins.
    const { count } = await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (count === 0) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return {
      accountId: session.accountId,
      refreshToken: await this.issue(session.accountId, context),
    };
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: this.hash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hash(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private parseTtl(value: string): number {
    const match = TTL_PATTERN.exec(value);

    if (!match) {
      throw new Error(
        `Invalid refresh token TTL "${value}", expected e.g. "30d" or "12h"`,
      );
    }

    return parseInt(match[1], 10) * UNIT_MS[match[2]];
  }
}
