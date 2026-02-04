import { BadRequestException, Controller, Get, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";

import { GmailOAuthService } from "@/modules/expenses/application/services/gmail-oauth.service";
import type { Env } from "@/app/config/env.schema";
import type { Response } from "express";

@ApiTags("expenses")
@Controller("auth/google")
export class GmailOAuthController {
  constructor(
    private readonly gmailOAuthService: GmailOAuthService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Get("callback")
  @ApiOperation({ summary: "Gmail OAuth callback (public)" })
  @ApiResponse({ status: 302, description: "Redirects back to web app" })
  async gmailCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BadRequestException("Missing OAuth code or state");
    }

    await this.gmailOAuthService.handleCallback({ code, state });
    const baseUrl = this.configService.get("WEB_APP_URL", { infer: true });
    return res.redirect(`${baseUrl}/expenses/emails?gmail=connected`);
  }
}
