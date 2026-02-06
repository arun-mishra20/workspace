import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    Request,
    Res,
    UseGuards,
    NotFoundException,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import { JwtAuthGuard } from "@/modules/auth/presentation/guards/jwt-auth.guard";
import { ExpensesService } from "@/modules/expenses/application/services/expenses.service";
import { GmailOAuthService } from "@/modules/expenses/application/services/gmail-oauth.service";
import { SyncExpensesDto } from "@/modules/expenses/presentation/dtos/sync-expenses.dto";
import { ListExpenseEmailsDto } from "@/modules/expenses/presentation/dtos/list-expense-emails.dto";
import { ListExpensesDto } from "@/modules/expenses/presentation/dtos/list-expenses.dto";
import { UpdateTransactionDto } from "@/modules/expenses/presentation/dtos/update-transaction.dto";
import { OffsetListResponseDto } from "@/shared/infrastructure/dtos/list-response.dto";
import type { RawEmail, Transaction } from "@workspace/domain";
import type { FastifyReply, FastifyRequest } from "fastify";

@ApiTags("expenses")
@Controller("expenses")
export class ExpensesController {
    constructor(
        private readonly expensesService: ExpensesService,
        private readonly gmailOAuthService: GmailOAuthService,
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

    @Get("transactions")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "List derived expense transactions" })
    @ApiResponse({
        status: 200,
        description: "Returns paginated expense transactions",
    })
    async listExpenses(
        @Request() req: FastifyRequest & { user: { id: string } },
        @Query() query: ListExpensesDto,
    ): Promise<OffsetListResponseDto<Transaction>> {
        const page = query.page ?? 1;
        const page_size = query.page_size ?? 20;
        const offset = (page - 1) * page_size;

        const { data, total } = await this.expensesService.listExpenses({
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

    @Get("transactions/:id")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Get a single transaction" })
    @ApiParam({ name: "id", description: "Transaction ID" })
    @ApiResponse({
        status: 200,
        description: "Returns the transaction",
    })
    async getTransaction(
        @Request() req: FastifyRequest & { user: { id: string } },
        @Param("id") id: string,
    ): Promise<Transaction> {
        const transaction = await this.expensesService.getTransactionById({
            userId: req.user.id,
            id,
        });
        if (!transaction) {
            throw new NotFoundException("Transaction not found");
        }
        return transaction;
    }

    @Patch("transactions/:id")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Update / correct a transaction" })
    @ApiParam({ name: "id", description: "Transaction ID" })
    @ApiResponse({
        status: 200,
        description: "Returns the updated transaction",
    })
    async updateTransaction(
        @Request() req: FastifyRequest & { user: { id: string } },
        @Param("id") id: string,
        @Body() dto: UpdateTransactionDto,
    ): Promise<Transaction> {
        return this.expensesService.updateTransaction({
            userId: req.user.id,
            id,
            data: dto,
        });
    }

    @Get("emails/:id")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Get a single expense email (raw)" })
    @ApiParam({ name: "id", description: "Raw email ID" })
    @ApiResponse({
        status: 200,
        description: "Returns the raw email payload (html/text/headers)",
    })
    async getExpenseEmail(
        @Request() req: FastifyRequest & { user: { id: string } },
        @Param("id") id: string,
    ): Promise<RawEmail> {
        const email = await this.expensesService.getExpenseEmailById({ userId: req.user.id, id });
        if (!email) {
            throw new NotFoundException("Email not found");
        }
        return email;
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
}
