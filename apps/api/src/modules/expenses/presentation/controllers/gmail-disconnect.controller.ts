import { Controller, Delete, Request, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "@/modules/auth/presentation/guards/jwt-auth.guard";
import { GmailOAuthService } from "@/modules/expenses/application/services/gmail-oauth.service";
import type { FastifyRequest } from "fastify";

@ApiTags("expenses")
@Controller("expenses/gmail")
export class GmailDisconnectController {
    constructor(private readonly gmailOAuthService: GmailOAuthService) {}

    @Delete("disconnect")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Disconnect Gmail" })
    @ApiResponse({ status: 200, description: "Disconnected Gmail" })
    async disconnect(
        @Request() req: FastifyRequest & { user: { id: string } },
    ): Promise<{ connected: boolean; email?: string | null }> {
        console.log("[GmailDisconnectController] disconnect user:", req.user?.id);
        return this.gmailOAuthService.disconnect(req.user.id);
    }
}
