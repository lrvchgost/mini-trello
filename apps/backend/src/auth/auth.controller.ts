import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthResponse, User } from '@min-trello/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { APP_ENV, type AppEnv } from '../config/env';
import { AuthService } from './auth.service';
import type { AuthenticatedUser, AuthSession } from './auth.types';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from './auth.constants';
import { parseDurationMs } from './auth.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const session = await this.authService.register(dto);
    this.setRefreshCookie(res, session.refreshToken);
    return this.toResponse(session);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() _dto: LoginDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const session = await this.authService.login(user);
    this.setRefreshCookie(res, session.refreshToken);
    return this.toResponse(session);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const session = await this.authService.refresh(req.cookies?.[REFRESH_COOKIE_NAME]);
    this.setRefreshCookie(res, session.refreshToken);
    return { accessToken: session.accessToken };
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<User> {
    return this.authService.getProfile(user.id);
  }

  private toResponse(session: AuthSession): AuthResponse {
    return { user: session.user, accessToken: session.accessToken };
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.env.COOKIE_SECURE,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: parseDurationMs(this.env.JWT_REFRESH_EXPIRES_IN),
    });
  }
}
