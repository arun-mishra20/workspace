import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    Request,
    Res,
    UseGuards,
    NotFoundException,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { SkipThrottle } from "@nestjs/throttler";

import { JwtAuthGuard } from "@/modules/auth/presentation/guards/jwt-auth.guard";
import { ExpensesService } from "@/modules/expenses/application/services/expenses.service";
import { GmailOAuthService } from "@/modules/expenses/application/services/gmail-oauth.service";
import { SyncExpensesDto } from "@/modules/expenses/presentation/dtos/sync-expenses.dto";
import { ListExpenseEmailsDto } from "@/modules/expenses/presentation/dtos/list-expense-emails.dto";
import { OffsetListResponseDto } from "@/shared/infrastructure/dtos/list-response.dto";
import type { RawEmail } from "@workspace/domain";
import type { Env } from "@/app/config/env.schema";
import type { FastifyReply, FastifyRequest } from "fastify";

@ApiTags("expenses")
@Controller("expenses")
export class ExpensesController {
    constructor(
        private readonly expensesService: ExpensesService,
        private readonly gmailOAuthService: GmailOAuthService,
        private readonly configService: ConfigService<Env, true>,
    ) {}

    @Post("sync")
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({ summary: "Start async expense email sync job" })
    @ApiResponse({
        status: 202,
        description: "Sync job started, returns job ID for status polling",
    })
    async syncExpenses(
        @Request() req: FastifyRequest & { user: { id: string } },
        @Body() dto: SyncExpensesDto,
    ): Promise<{ jobId: string; message: string }> {
        const { jobId } = await this.expensesService.startSyncJob({
            userId: req.user.id,
            query: dto.query,
        });
        return {
            jobId,
            message: "Sync job started. Poll /expenses/sync/:jobId for status.",
        };
    }

    @Get("sync/:jobId")
    @UseGuards(JwtAuthGuard)
    @SkipThrottle() // Skip rate limiting for status polling
    @ApiOperation({ summary: "Get sync job status" })
    @ApiParam({ name: "jobId", description: "The sync job ID" })
    @ApiResponse({
        status: 200,
        description: "Returns sync job status and progress",
    })
    async getSyncJobStatus(
        @Request() req: FastifyRequest & { user: { id: string } },
        @Param("jobId") jobId: string,
    ) {
        const job = await this.expensesService.getSyncJobStatus(jobId);
        if (!job || job.userId !== req.user.id) {
            throw new NotFoundException("Sync job not found");
        }
        return job;
    }

    @Get("sync")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "List recent sync jobs" })
    @ApiResponse({
        status: 200,
        description: "Returns list of recent sync jobs",
    })
    async listSyncJobs(
        @Request() req: FastifyRequest & { user: { id: string } },
        @Query("limit") limit?: string,
    ) {
        return this.expensesService.getUserSyncJobs(req.user.id, limit ? parseInt(limit, 10) : 10);
    }

    @Get("emails")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "List expense-related emails" })
    @ApiResponse({
        status: 200,
        description: "Returns paginated expense email list",
    })
    async listExpenseEmails(
        @Request() req: FastifyRequest & { user: { id: string } },
        @Query() query: ListExpenseEmailsDto,
    ): Promise<OffsetListResponseDto<RawEmail>> {
        const page = query.page ?? 1;
        const page_size = query.page_size ?? 20;
        const offset = (page - 1) * page_size;

        const { data, total } = await this.expensesService.listExpenseEmails({
            userId: req.user.id,
            limit: page_size,
            offset,
        });

        return {
            object: "list",
            data,
            page,
            page_size,
            total,
            has_more: offset + data.length < total,
        };
    }

    @Get("gmail/connect")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Start Gmail OAuth flow" })
    @ApiResponse({ status: 200, description: "Returns OAuth URL" })
    async connectGmail(
        @Request() req: FastifyRequest & { user: { id: string } },
    ): Promise<{ url: string }> {
        const url = this.gmailOAuthService.getAuthUrl(req.user.id);
        return { url };
    }

    @Get("gmail/status")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Get Gmail connection status" })
    @ApiResponse({ status: 200, description: "Returns Gmail connection status" })
    async gmailStatus(
        @Request() req: FastifyRequest & { user: { id: string } },
        @Res({ passthrough: true }) res: FastifyReply,
    ): Promise<{ connected: boolean; email?: string | null }> {
        // Disable caching and ETag for dynamic status endpoint
        res.header("Cache-Control", "no-cache, no-store, must-revalidate");
        res.header("Pragma", "no-cache");
        res.header("Expires", "0");
        return this.gmailOAuthService.getStatus(req.user.id);
    }

    @Get("gmail/callback")
    @ApiOperation({ summary: "Gmail OAuth callback (legacy)" })
    async gmailCallback(
        @Query("code") code: string | undefined,
        @Query("state") state: string | undefined,
        @Res() res: FastifyReply,
    ) {
        if (!code || !state) {
            return res.code(400).send({ message: "Missing OAuth code or state" });
        }

        await this.gmailOAuthService.handleCallback({ code, state });
        const baseUrl = this.configService.get("WEB_APP_URL", { infer: true });
        return res.redirect(`${baseUrl}/expenses/emails?gmail=connected`);
    }
}
