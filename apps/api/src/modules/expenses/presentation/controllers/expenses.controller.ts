import {
  Body,
  Controller,
  Delete,
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
  BadRequestException,
  SetMetadata,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'

import { ZodValidationPipe } from '@/app/pipes/zod-validation.pipe'
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard'
import { ExpenseLlmCategorizationService } from '@/modules/expenses/application/services/expense-llm-categorization.service'
import { CategorizationRulesService } from '@/modules/expenses/application/services/categorization-rules.service'
import { RuleDashboardAnalyticsService } from '@/modules/expenses/application/services/rule-dashboard-analytics.service'
import { RuleDashboardsService } from '@/modules/expenses/application/services/rule-dashboards.service'
import { ExpensesService } from '@/modules/expenses/application/services/expenses.service'
import { GmailOAuthService } from '@/modules/expenses/application/services/gmail-oauth.service'
import {
  AnalyticsExcludeCategoriesQuery,
  parseAnalyticsExcludeCategories,
} from '@/modules/expenses/presentation/utils/analytics-query.utils'
import { BulkCategorizeDto } from '@/modules/expenses/presentation/dtos/bulk-categorize.dto'
import {
  CreateCategorizationRuleInputSchema,
  ReorderRulesRequestSchema,
  RuleApplyRequestSchema,
  RulePreviewRequestSchema,
  UpdateCategorizationRuleInputSchema,
} from '@/modules/expenses/presentation/dtos/categorization-rule.dto'
import {
  CreateRuleDashboardInputSchema,
  RuleDashboardAnalyticsRequestSchema,
  UpdateRuleDashboardInputSchema,
} from '@/modules/expenses/presentation/dtos/rule-dashboard.dto'
import { BulkUpdateTransactionsDto } from '@/modules/expenses/presentation/dtos/bulk-update-transactions.dto'
import { ListExpensesCursorSchema } from '@/modules/expenses/presentation/dtos/expenses.schema'
import { ListExpenseEmailsDto } from '@/modules/expenses/presentation/dtos/list-expense-emails.dto'
import { ListExpensesDto } from '@/modules/expenses/presentation/dtos/list-expenses.dto'
import { LlmCategorizeRequestSchema } from '@/modules/expenses/presentation/dtos/llm-categorize.dto'
import { SyncExpensesDto } from '@/modules/expenses/presentation/dtos/sync-expenses.dto'
import { UpdateTransactionDto } from '@/modules/expenses/presentation/dtos/update-transaction.dto'
import { ListResponseDto, OffsetListResponseDto } from '@/shared/infrastructure/dtos/list-response.dto'

import type { ListExpensesCursorInput } from '@/modules/expenses/presentation/dtos/expenses.schema'
import type { RawEmail, Transaction, AnalyticsPeriod } from '@workspace/domain'
import type { FastifyReply, FastifyRequest } from 'fastify'

@ApiTags('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly gmailOAuthService: GmailOAuthService,
    private readonly llmCategorizationService: ExpenseLlmCategorizationService,
    private readonly categorizationRulesService: CategorizationRulesService,
    private readonly ruleDashboardsService: RuleDashboardsService,
    private readonly ruleDashboardAnalyticsService: RuleDashboardAnalyticsService,
  ) {}

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Start async expense email sync job' })
  @ApiResponse({
    status: 202,
    description: 'Sync job started, returns job ID for status polling',
  })
  async syncExpenses(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body() dto: SyncExpensesDto,
  ): Promise<{ jobId: string, message: string }> {
    const { jobId } = await this.expensesService.startSyncJob({
      userId: req.user.id,
      query: dto.query,
      fromDate: dto.fromDate,
    })
    return {
      jobId,
      message: 'Sync job started. Poll /expenses/sync/:jobId for status.',
    }
  }

  @Post('reprocess')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Re-parse stored emails without fetching from Gmail',
    description: 'By default, only processes unprocessed emails. Use forceProcessAll=true to reprocess all emails.',
  })
  @ApiQuery({
    name: 'forceProcessAll',
    required: false,
    type: Boolean,
    description: 'If true, reprocess all emails. If false or omitted, only process unprocessed emails.',
  })
  @ApiResponse({
    status: 202,
    description: 'Reprocess job started, returns job ID for status polling',
  })
  async reprocessEmails(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('forceProcessAll') forceProcessAll?: string,
  ): Promise<{ jobId: string, message: string }> {
    const { jobId } = await this.expensesService.startReprocessJob({
      userId: req.user.id,
      forceProcessAll: forceProcessAll === 'true',
    })
    return {
      jobId,
      message: `Reprocess job started (${forceProcessAll === 'true' ? 'all emails' : 'unprocessed emails only'}). Poll /expenses/sync/:jobId for status.`,
    }
  }

  @Get('sync/:jobId')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle() // Skip rate limiting for status polling
  @ApiOperation({ summary: 'Get sync job status' })
  @ApiParam({ name: 'jobId', description: 'The sync job ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns sync job status and progress',
  })
  async getSyncJobStatus(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('jobId') jobId: string,
  ) {
    const job = await this.expensesService.getSyncJobStatus(jobId)
    if (job?.userId !== req.user.id) {
      throw new NotFoundException('Sync job not found')
    }
    return job
  }

  @Get('sync')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List recent sync jobs' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of recent sync jobs',
  })
  async listSyncJobs(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('limit') limit?: string,
  ) {
    return this.expensesService.getUserSyncJobs(req.user.id, limit ? Number.parseInt(limit, 10) : 10)
  }

  @Get('emails')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List expense-related emails' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated expense email list',
  })
  async listExpenseEmails(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query() query: ListExpenseEmailsDto,
  ): Promise<OffsetListResponseDto<RawEmail>> {
    const page = query.page ?? 1
    const page_size = query.page_size ?? 20
    const offset = (page - 1) * page_size

    const { data, total } = await this.expensesService.listExpenseEmails({
      userId: req.user.id,
      limit: page_size,
      offset,
      sortBy: query.sort_by,
      sortOrder: query.sort_order,
    })

    return {
      object: 'list',
      data,
      page,
      page_size,
      total,
      has_more: offset + data.length < total,
    }
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List derived expense transactions' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated expense transactions',
  })
  async listExpenses(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query() query: ListExpensesDto,
  ): Promise<OffsetListResponseDto<Transaction>> {
    const page = query.page ?? 1
    const page_size = query.page_size ?? 20
    const offset = (page - 1) * page_size

    const filters: Record<string, unknown> = {}
    if (query.category) filters.category = query.category
    if (query.subcategory) filters.subcategory = query.subcategory
    if (query.mode) filters.mode = query.mode
    if (query.categorization_method) {
      filters.categorizationMethod = query.categorization_method
    }
    if (query.review !== undefined) filters.requiresReview = query.review === 'true'
    if (query.date_from) filters.dateFrom = new Date(query.date_from)
    if (query.date_to) filters.dateTo = new Date(query.date_to)
    if (query.search) filters.search = query.search
    if (query.card_last4) filters.cardLast4 = query.card_last4
    if (query.sort_by) filters.sortBy = query.sort_by
    if (query.sort_order) filters.sortOrder = query.sort_order

    const { data, total } = await this.expensesService.listExpenses({
      userId: req.user.id,
      limit: page_size,
      offset,
      filters: Object.keys(filters).length > 0 ? (filters) : undefined,
    })

    return {
      object: 'list',
      data,
      page,
      page_size,
      total,
      has_more: offset + data.length < total,
    }
  }

  @Get('transactions/cursor')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List transactions with cursor-based pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns cursor-paginated expense transactions',
  })
  async listExpensesCursor(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query(new ZodValidationPipe(ListExpensesCursorSchema)) query: ListExpensesCursorInput,
  ): Promise<ListResponseDto<Transaction>> {
    const filters: Record<string, unknown> = {}
    if (query.category) filters.category = query.category
    if (query.subcategory) filters.subcategory = query.subcategory
    if (query.mode) filters.mode = query.mode
    if (query.categorization_method) {
      filters.categorizationMethod = query.categorization_method
    }
    if (query.review !== undefined) filters.requiresReview = query.review === 'true'
    if (query.from) filters.dateFrom = new Date(query.from)
    if (query.to) filters.dateTo = new Date(query.to)
    if (query.search) filters.search = query.search
    if (query.card_last4) filters.cardLast4 = query.card_last4
    if (query.sort_by) filters.sortBy = query.sort_by
    if (query.sort_order) filters.sortOrder = query.sort_order

    const { data, nextCursor, hasMore } = await this.expensesService.listExpensesCursor({
      userId: req.user.id,
      pageSize: query.page_size,
      cursor: query.cursor,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    })

    return {
      object: 'list',
      data,
      has_more: hasMore,
      next_cursor: nextCursor,
    }
  }

  @Get('transactions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the transaction',
  })
  async getTransaction(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('id') id: string,
  ): Promise<Transaction> {
    const transaction = await this.expensesService.getTransactionById({
      userId: req.user.id,
      id,
    })
    if (!transaction) {
      throw new NotFoundException('Transaction not found')
    }
    return transaction
  }

  @Patch('transactions/bulk-categorize')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Bulk categorize transactions by merchant',
    description:
            'Updates the category and subcategory for ALL transactions matching the given merchant name.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the merchant, new category, subcategory, and count of updated rows',
  })
  async bulkCategorizeByMerchant(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body() dto: BulkCategorizeDto,
  ) {
    const result = await this.expensesService.bulkCategorizeByMerchant({
      userId: req.user.id,
      merchant: dto.merchant,
      category: dto.category,
      subcategory: dto.subcategory,
      categoryMetadata: dto.categoryMetadata,
    })
    return { data: result }
  }

  @Patch('transactions/bulk-update')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Bulk update transactions by IDs',
    description:
            'Updates category, subcategory, mode, or review status for a set of transaction IDs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the count of updated transactions',
  })
  async bulkUpdateTransactions(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body() dto: BulkUpdateTransactionsDto,
  ) {
    const result = await this.expensesService.bulkUpdateByIds({
      userId: req.user.id,
      ids: dto.ids,
      data: dto.data,
    })
    return { data: result }
  }

  @Patch('transactions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update / correct a transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated transaction',
  })
  async updateTransaction(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.expensesService.updateTransaction({
      userId: req.user.id,
      id,
      data: dto,
    })
  }

  @Get('merchants')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get distinct merchants with category info',
    description:
            'Returns a list of unique merchants for the user with their most common category assignment and transaction count.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of merchants with category info',
  })
  async getDistinctMerchants(@Request() req: FastifyRequest & { user: { id: string } }) {
    const merchants = await this.expensesService.getDistinctMerchants(req.user.id)
    return { data: merchants }
  }

  @Get('emails/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single expense email (raw)' })
  @ApiParam({ name: 'id', description: 'Raw email ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the raw email payload (html/text/headers)',
  })
  async getExpenseEmail(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('id') id: string,
  ): Promise<RawEmail> {
    const email = await this.expensesService.getExpenseEmailById({ userId: req.user.id, id })
    if (!email) {
      throw new NotFoundException('Email not found')
    }
    return email
  }

  // ── Analytics ──

  @Get('analytics/summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Spending summary for a period' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Explicit start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Explicit end date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getAnalyticsSummary(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    const resolvedExcludeCategories = parseAnalyticsExcludeCategories(excludeCategories)

    if (startDate && endDate) {
      return this.expensesService.getSpendingSummaryForDateRange(
        req.user.id,
        startDate,
        endDate,
        cardLast4,
        resolvedExcludeCategories,
      )
    }

    return this.expensesService.getSpendingSummary(
      req.user.id,
      period,
      cardLast4,
      resolvedExcludeCategories,
    )
  }

  @Get('analytics/by-category')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Spending grouped by category' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getByCategory(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getSpendingByCategory(
      req.user.id,
      period,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/by-subcategory')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Spending grouped by subcategory' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getBySubcategory(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getSpendingBySubcategory(
      req.user.id,
      period,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/by-mode')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Spending grouped by payment mode' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getByMode(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getSpendingByMode(
      req.user.id,
      period,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/top-merchants')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Top merchants by spend' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getTopMerchants(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('limit') limit?: string,
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getTopMerchants(
      req.user.id,
      period,
      limit ? Number.parseInt(limit, 10) : 10,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/daily')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Daily spending breakdown' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getDailySpending(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getDailySpending(
      req.user.id,
      period,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/monthly-trend')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Monthly trend (last N months)' })
  @AnalyticsExcludeCategoriesQuery()
  async getMonthlyTrend(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('months') months?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getMonthlyTrend(
      req.user.id,
      months ? Number.parseInt(months, 10) : 12,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/by-card')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Spending grouped by credit card' })
  @ApiQuery({ name: 'card_last4', required: false })
  async getByCard(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
  ) {
    return this.expensesService.getSpendingByCard(req.user.id, period, cardLast4)
  }

  @Get('cards')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List configured credit cards' })
  @ApiResponse({
    status: 200,
    description: 'Returns all configured credit cards with status metadata',
  })
  listCreditCards() {
    return this.expensesService.listCreditCards()
  }

  // ── Extended Analytics ──

  @Get('analytics/day-of-week')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Spending by day of week' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getDayOfWeekSpending(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getDayOfWeekSpending(
      req.user.id,
      period,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/category-trend')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Category spending trend over months' })
  @AnalyticsExcludeCategoriesQuery()
  async getCategoryTrend(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('months') months?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getCategoryTrend(
      req.user.id,
      months ? Number.parseInt(months, 10) : 6,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/period-comparison')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Compare current vs previous period' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getPeriodComparison(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getPeriodComparison(
      req.user.id,
      period,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/cumulative')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cumulative spending over time' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getCumulativeSpend(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getCumulativeSpend(
      req.user.id,
      period,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/savings-rate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Monthly savings rate (income vs expenses)' })
  @AnalyticsExcludeCategoriesQuery()
  async getSavingsRate(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('months') months?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getSavingsRate(
      req.user.id,
      months ? Number.parseInt(months, 10) : 12,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/card-categories')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Per-card category breakdown' })
  @ApiQuery({ name: 'card_last4', required: false })
  async getCardCategories(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
  ) {
    return this.expensesService.getCardCategoryBreakdown(req.user.id, period, cardLast4)
  }

  @Get('analytics/top-vpas')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Top UPI VPA payees' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getTopVpas(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('limit') limit?: string,
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getTopVpas(
      req.user.id,
      period,
      limit ? Number.parseInt(limit, 10) : 10,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/velocity')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Spending velocity (rolling average ₹/day)' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getSpendingVelocity(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getSpendingVelocity(
      req.user.id,
      period,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/milestone-etas')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Milestone completion ETAs for all cards' })
  async getMilestoneEtas(@Request() req: FastifyRequest & { user: { id: string } }) {
    return this.expensesService.getMilestoneEtas(req.user.id)
  }

  @Get('analytics/largest-transactions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Largest transactions in period' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getLargestTransactions(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('limit') limit?: string,
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getLargestTransactions(
      req.user.id,
      period,
      limit ? Number.parseInt(limit, 10) : 10,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/bus-spending')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Bus spending analytics and patterns' })
  @ApiResponse({
    status: 200,
    description: 'Returns bus spending summary, routes, frequency, and trends',
  })
  async getBusAnalytics(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'year',
  ) {
    return this.expensesService.getBusAnalytics(req.user.id, period)
  }

  @Get('analytics/investment-patterns')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Investment analytics across stocks, mutual funds, and gold' })
  @ApiResponse({
    status: 200,
    description:
            'Returns investment summary, asset allocation, platform breakdown, SIP detection, and trends',
  })
  async getInvestmentAnalytics(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'year',
  ) {
    return this.expensesService.getInvestmentAnalytics(req.user.id, period)
  }

  @Get('llm-providers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check which LLM providers are available for categorization' })
  @ApiResponse({ status: 200, description: 'Returns availability of OpenWire and Gemini' })
  async getLlmProviders() {
    return this.llmCategorizationService.getAvailableProviders()
  }

  @Post('categorize-with-llm')
  @SetMetadata('request_timeout_ms', null)
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Categorize transactions using an LLM provider' })
  @ApiResponse({ status: 200, description: 'Returns categorization suggestions' })
  async categorizeWithLlm(
    @Request() req: FastifyRequest & { user: { id: string } },
  ) {
    const parsed = LlmCategorizeRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues)
    }

    const transactions = await this.expensesService.findTransactionsByIds(
      req.user.id,
      parsed.data.transactionIds,
    )

    if (transactions.length === 0) {
      throw new NotFoundException('No transactions found for the given IDs')
    }

    const suggestions = await this.llmCategorizationService.categorize(
      transactions,
      parsed.data.provider,
    )

    return { suggestions }
  }

  // ── Classification health & anomalies ──

  @Get('analytics/classification-health')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Classification health metrics for a period' })
  @ApiQuery({ name: 'card_last4', required: false })
  async getClassificationHealth(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
  ) {
    return this.expensesService.getClassificationHealth(req.user.id, period, cardLast4)
  }

  @Get('analytics/spend-anomalies')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Spending anomalies for a period' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async getSpendAnomalies(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
  ) {
    return this.expensesService.getSpendAnomalies(
      req.user.id,
      period,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
  }

  @Get('analytics/export')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Export transactions as CSV with full metadata' })
  @ApiQuery({ name: 'card_last4', required: false })
  @AnalyticsExcludeCategoriesQuery()
  async exportTransactions(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('period') period: AnalyticsPeriod = 'month',
    @Query('card_last4') cardLast4?: string,
    @Query('excludeCategories') excludeCategories?: string,
    @Res() res?: FastifyReply,
  ) {
    const csv = await this.expensesService.exportTransactionsCsv(
      req.user.id,
      period,
      cardLast4,
      parseAnalyticsExcludeCategories(excludeCategories),
    )
    res?.header('Content-Type', 'text/csv')
    res?.header('Content-Disposition', 'attachment; filename="transactions-export.csv"')
    return res?.send(csv)
  }

  // ── Categorization rules ──

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List available expense categories and subcategories' })
  getCategories() {
    return this.categorizationRulesService.getCategories()
  }

  @Get('rules')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List user categorization rules' })
  listRules(@Request() req: FastifyRequest & { user: { id: string } }) {
    return this.categorizationRulesService.listRules(req.user.id)
  }

  @Get('rules/suggested')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Suggest categorization rules from transaction patterns' })
  suggestRules(@Request() req: FastifyRequest & { user: { id: string } }) {
    return this.categorizationRulesService.suggestRules(req.user.id)
  }

  @Get('rules/conflicts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detect transactions matching multiple enabled rules' })
  detectRuleConflicts(@Request() req: FastifyRequest & { user: { id: string } }) {
    return this.categorizationRulesService.detectConflicts(req.user.id)
  }

  @Patch('rules/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reorder categorization rules by priority' })
  reorderRules(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body(new ZodValidationPipe(ReorderRulesRequestSchema)) body: unknown,
  ) {
    const parsed = ReorderRulesRequestSchema.parse(body)
    return this.categorizationRulesService.reorderRules(req.user.id, parsed.orderedIds)
  }

  @Post('rules/reapply-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reapply all enabled rules to historical transactions' })
  reapplyAllRules(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query('force') force?: string,
  ) {
    return this.categorizationRulesService.reapplyAllRules(
      req.user.id,
      force === 'true',
    )
  }

  @Post('rules/preview')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview rule matches against historical transactions' })
  previewRule(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body(new ZodValidationPipe(RulePreviewRequestSchema)) body: unknown,
  ) {
    return this.categorizationRulesService.previewRule(
      req.user.id,
      RulePreviewRequestSchema.parse(body),
    )
  }

  @Get('rules/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a categorization rule by ID' })
  getRule(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.categorizationRulesService.getRule(req.user.id, id)
  }

  @Post('rules')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a categorization rule' })
  createRule(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body(new ZodValidationPipe(CreateCategorizationRuleInputSchema)) body: unknown,
  ) {
    return this.categorizationRulesService.createRule(
      req.user.id,
      CreateCategorizationRuleInputSchema.parse(body),
    )
  }

  @Patch('rules/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a categorization rule' })
  updateRule(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCategorizationRuleInputSchema)) body: unknown,
  ) {
    return this.categorizationRulesService.updateRule(
      req.user.id,
      id,
      UpdateCategorizationRuleInputSchema.parse(body),
    )
  }

  @Delete('rules/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a categorization rule' })
  deleteRule(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.categorizationRulesService.deleteRule(req.user.id, id)
  }

  @Post('rules/:id/apply')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a rule to matching historical transactions' })
  applyRule(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RuleApplyRequestSchema)) body: unknown,
  ) {
    return this.categorizationRulesService.applyRule(
      req.user.id,
      id,
      RuleApplyRequestSchema.parse(body),
    )
  }

  // ── Rule dashboards ──

  @Get('rule-dashboards')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List saved rule dashboards' })
  listRuleDashboards(@Request() req: FastifyRequest & { user: { id: string } }) {
    return this.ruleDashboardsService.listDashboards(req.user.id)
  }

  @Post('rule-dashboards')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a saved rule dashboard' })
  createRuleDashboard(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body(new ZodValidationPipe(CreateRuleDashboardInputSchema)) body: unknown,
  ) {
    return this.ruleDashboardsService.createDashboard(
      req.user.id,
      CreateRuleDashboardInputSchema.parse(body),
    )
  }

  @Post('rule-dashboards/analytics')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compute analytics for one or more rules (OR, deduped)' })
  computeRuleDashboardAnalytics(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body(new ZodValidationPipe(RuleDashboardAnalyticsRequestSchema)) body: unknown,
  ) {
    return this.ruleDashboardAnalyticsService.computeAnalytics(
      req.user.id,
      RuleDashboardAnalyticsRequestSchema.parse(body),
    )
  }

  @Get('rule-dashboards/:id/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Compute analytics for a saved rule dashboard' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'cardLast4', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  getSavedRuleDashboardAnalytics(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('cardLast4') cardLast4?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ruleDashboardsService.getDashboard(req.user.id, id).then((dashboard) =>
      this.ruleDashboardAnalyticsService.computeAnalytics(req.user.id, {
        ruleIds: dashboard.ruleIds,
        inlineRules: dashboard.inlineRules,
        startDate,
        endDate,
        cardLast4,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 25,
      }),
    )
  }

  @Get('rule-dashboards/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a saved rule dashboard' })
  getRuleDashboard(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.ruleDashboardsService.getDashboard(req.user.id, id)
  }

  @Patch('rule-dashboards/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a saved rule dashboard' })
  updateRuleDashboard(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRuleDashboardInputSchema)) body: unknown,
  ) {
    return this.ruleDashboardsService.updateDashboard(
      req.user.id,
      id,
      UpdateRuleDashboardInputSchema.parse(body),
    )
  }

  @Delete('rule-dashboards/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a saved rule dashboard' })
  deleteRuleDashboard(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.ruleDashboardsService.deleteDashboard(req.user.id, id)
  }

  @Get('gmail/connect')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Start Gmail OAuth flow' })
  @ApiResponse({ status: 200, description: 'Returns OAuth URL' })
  async connectGmail(
    @Request() req: FastifyRequest & { user: { id: string } },
  ): Promise<{ url: string }> {
    const url = this.gmailOAuthService.getAuthUrl(req.user.id)
    return { url }
  }

  @Get('gmail/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Gmail connection status' })
  @ApiResponse({ status: 200, description: 'Returns Gmail connection status' })
  async gmailStatus(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ connected: boolean, email?: string | null }> {
    // Disable caching and ETag for dynamic status endpoint
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '0')
    return this.gmailOAuthService.getStatus(req.user.id)
  }
}
