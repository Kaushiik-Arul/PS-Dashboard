import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { Environment } from '../../config/environment';
import {
  AllowPasswordChange,
  CurrentUser,
  Public,
} from './auth.decorators';
import { clearAuthCookies, setAuthCookies } from './auth.cookies';
import { AuthService, type SessionResult } from './auth.service';
import type { AuthenticatedUser, RequestMetadata } from './auth.types';

function metadata(request: Request): RequestMetadata {
  return {
    ipAddress: request.ip || null,
    userAgent:
      typeof request.headers['user-agent'] === 'string'
        ? request.headers['user-agent'].slice(0, 500)
        : null,
  };
}

function responseUser(user: AuthenticatedUser) {
  return {
    accountId: user.accountId,
    persNo: user.persNo,
    displayName: user.displayName,
    loginEmail: user.loginEmail,
    role: user.role,
    roles: user.roles,
    mustChangePassword: user.mustChangePassword,
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  @Public()
  @Post('login')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() input: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(input, metadata(request));
    this.writeSession(response, result);
    return responseUser(result.user);
  }

  @AllowPasswordChange()
  @Get('me')
  @Header('Cache-Control', 'private, no-store')
  me(@CurrentUser() user: AuthenticatedUser) {
    return responseUser(user);
  }

  @AllowPasswordChange()
  @Post('change-password')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.changePassword(
      user,
      input,
      metadata(request),
    );
    this.writeSession(response, result);
    return responseUser(result.user);
  }

  @AllowPasswordChange()
  @Post('logout')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(user, metadata(request));
    clearAuthCookies(response, this.isProduction());
  }

  private writeSession(response: Response, result: SessionResult): void {
    setAuthCookies(
      response,
      this.isProduction(),
      result.sessionToken,
      result.csrfToken,
      result.expiresAt.getTime() - Date.now(),
    );
  }

  private isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }
}