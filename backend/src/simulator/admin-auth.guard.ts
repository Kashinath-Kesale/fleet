import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = this.configService.get<string>(
      'ADMIN_API_KEY',
      'peppermint-secret-2026',
    );

    const authHeader = request.headers['authorization'];
    const customHeader = request.headers['x-admin-key'];

    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    const providedKey = customHeader || bearerToken;

    if (!providedKey || providedKey !== adminKey) {
      throw new UnauthorizedException(
        'Unauthorized: Missing or invalid Admin API key',
      );
    }

    return true;
  }
}
