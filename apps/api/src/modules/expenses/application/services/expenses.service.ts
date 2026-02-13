import { Inject, Injectable, Logger } from "@nestjs/common";

import {
    EMAIL_PARSERS,
    type EmailParser,
} from "@/modules/expenses/application/ports/email-parser.port";
import {
    GMAIL_PROVIDER,
    type GmailProvider,
} from "@/modules/expenses/application/ports/gmail-provider.port";
import {
    RAW_EMAIL_REPOSITORY,
    type RawEmailRepository,
} from "@/modules/expenses/application/ports/raw-email.repository.port";
import {
    STATEMENT_REPOSITORY,
    type StatementRepository,
} from "@/modules/expenses/application/ports/statement.repository.port";
import {
    TRANSACTION_REPOSITORY,
    type TransactionRepository,
    type TransactionFilters,
    type DateRange,
} from "@/modules/expenses/application/ports/transaction.repository.port";
import {
    SYNC_JOB_REPOSITORY,
    type SyncJobRepository,
    type SyncJob,
} from "@/modules/expenses/application/ports/sync-job.repository.port";
import {
    MERCHANT_RULE_REPOSITORY,
    type MerchantCategoryRuleRepository,
} from "@/modules/expenses/application/ports/merchant-rule.repository.port";
import {
    TransactionCategorizer,
    type UserCategorizationRules,
} from "@/modules/expenses/infrastructure/categorization/transaction-categorizer";
import { CardResolver } from "@/modules/expenses/infrastructure/categorization/card-resolver";

import type {
    RawEmail,
    Transaction,
    UpdateTransactionInput,
    AnalyticsPeriod,
    SpendingSummary,
    SpendingByCategoryItem,
    SpendingByModeItem,
    SpendingByMerchantItem,
    DailySpendingItem,
    MonthlyTrendItem,
    SpendingByCardItem,
    MilestoneProgress,
    DayOfWeekSpendingItem,
    CategoryTrendItem,
    PeriodComparison,
    CumulativeSpendItem,
    SavingsRateItem,
    CardCategoryItem,
    TopVpaItem,
    SpendingVelocityItem,
    MilestoneEta,
    LargestTransactionItem,
} from "@workspace/domain";

@Injectable()
export class ExpensesService {
    private readonly logger = new Logger(ExpensesService.name);
    private readonly transactionCategorizer = TransactionCategorizer.getInstance();
    private readonly cardResolver = CardResolver.getInstance();

    constructor(
        @Inject(GMAIL_PROVIDER)
        private readonly gmailProvider: GmailProvider,
        @Inject(EMAIL_PARSERS)
        private readonly parsers: EmailParser[],
        @Inject(TRANSACTION_REPOSITORY)
        private readonly transactionRepository: TransactionRepository,
        @Inject(STATEMENT_REPOSITORY)
        private readonly statementRepository: StatementRepository,
        @Inject(RAW_EMAIL_REPOSITORY)
        private readonly rawEmailRepository: RawEmailRepository,
        @Inject(SYNC_JOB_REPOSITORY)
        private readonly syncJobRepository: SyncJobRepository,
        @Inject(MERCHANT_RULE_REPOSITORY)
        private readonly merchantRuleRepository: MerchantCategoryRuleRepository,
    ) {}

    /**
     * Start an async sync job
     * Returns immediately with a job ID that can be polled for status
     */
    async startSyncJob(params: { userId: string; query?: string }): Promise<{ jobId: string }> {
        const job = await this.syncJobRepository.create({
            userId: params.userId,
            query: params.query,
        });

        // Run the sync in the background with proper error isolation
        this.runSyncJob(job.id, params).catch(async (error) => {
            this.logger.error(`Sync job ${job.id} failed unexpectedly outside try-catch`, error);

            // Ensure job status is updated to failed even if error occurs outside main try-catch
            try {
                await this.syncJobRepository.update(job.id, {
                    status: "failed",
                    errorMessage: error instanceof Error ? error.message : "Unexpected error",
                    completedAt: new Date(),
                });
            } catch (updateError) {
                this.logger.error(
                    `Failed to update job ${job.id} status after unexpected error`,
                    updateError,
                );
            }
        });

        return { jobId: job.id };
    }

    /**
     * Get the status of a sync job
     */
    async getSyncJobStatus(jobId: string): Promise<SyncJob | null> {
        return this.syncJobRepository.findById(jobId);
    }

    /**
     * Get recent sync jobs for a user
     */
    async getUserSyncJobs(userId: string, limit = 10): Promise<SyncJob[]> {
        return this.syncJobRepository.findByUserId(userId, limit);
    }

    /**
     * Start a reprocess job — re-parse & re-categorize all stored emails
     * without fetching from Gmail. Returns a job ID for polling.
     */
    async startReprocessJob(params: { userId: string }): Promise<{ jobId: string }> {
        const job = await this.syncJobRepository.create({
            userId: params.userId,
            query: "__reprocess__",
        });

        this.runReprocessJob(job.id, params.userId).catch(async (error) => {
            this.logger.error(
                `Reprocess job ${job.id} failed unexpectedly outside try-catch`,
                error,
            );
            try {
                await this.syncJobRepository.update(job.id, {
                    status: "failed",
                    errorMessage: error instanceof Error ? error.message : "Unexpected error",
                    completedAt: new Date(),
                });
            } catch (updateError) {
                this.logger.error(`Failed to update reprocess job ${job.id} status`, updateError);
            }
        });

        return { jobId: job.id };
    }

    /**
     * Internal: re-parse all stored raw_emails for a user and upsert transactions.
     * Skips Gmail entirely — works purely from stored email data.
     */
    private async runReprocessJob(jobId: string, userId: string): Promise<void> {
        try {
            await this.syncJobRepository.update(jobId, {
                status: "processing",
                startedAt: new Date(),
            });

            const allEmails = await this.rawEmailRepository.listAllByUser(userId);

            await this.syncJobRepository.update(jobId, {
                totalEmails: allEmails.length,
            });

            this.logger.log(`Reprocess job ${jobId}: re-parsing ${allEmails.length} stored emails`);

            let totalTransactions = 0;
            let totalStatements = 0;

            // Load user's merchant category rules once for the entire reprocess
            const userRules = await this.buildUserCategorizationRules(userId);

            for (const email of allEmails) {
                try {
                    const parser = this.findParser(email);
                    if (!parser) {
                        this.logger.debug(
                            `Reprocess job ${jobId}: no parser found for email ${email.id} (from=${email.from}, subject=${email.subject.slice(0, 60)})`,
                        );
                        await this.syncJobRepository.incrementProgress(jobId, "processedEmails");
                        continue;
                    }

                    const parsedTransactions = parser.parseTransactions(email);

                    if (parsedTransactions.length === 0) {
                        this.logger.debug(
                            `Reprocess job ${jobId}: parser returned 0 txns for email ${email.id} (subject=${email.subject.slice(0, 60)}, bodyLen=${email.bodyText.length}, htmlLen=${email.bodyHtml?.length ?? 0}, snippet=${email.snippet.slice(0, 60)})`,
                        );
                    }

                    const transactions = this.categorizeTransactions(parsedTransactions, userRules);

                    if (transactions.length > 0) {
                        await this.transactionRepository.upsertMany(transactions);
                        totalTransactions += transactions.length;
                        await this.syncJobRepository.incrementProgress(
                            jobId,
                            "transactions",
                            transactions.length,
                        );
                    }

                    const statement = parser.parseStatement(email);
                    if (statement) {
                        await this.statementRepository.upsert(statement);
                        totalStatements++;
                        await this.syncJobRepository.incrementProgress(jobId, "statements");
                    }

                    await this.syncJobRepository.incrementProgress(jobId, "processedEmails");
                } catch (emailError) {
                    const errMsg =
                        emailError instanceof Error
                            ? `${emailError.message}\n${emailError.stack}`
                            : String(emailError);
                    this.logger.warn(
                        `Reprocess job ${jobId}: failed to process email ${email.id} (subject=${email.subject.slice(0, 60)}, bodyLen=${email.bodyText.length}, htmlLen=${email.bodyHtml?.length ?? 0}): ${errMsg}`,
                    );
                    await this.syncJobRepository.incrementProgress(jobId, "processedEmails");
                }
            }

            await this.syncJobRepository.update(jobId, {
                status: "completed",
                completedAt: new Date(),
            });

            this.logger.log(
                `Reprocess job ${jobId} completed: ${totalTransactions} transactions, ${totalStatements} statements from ${allEmails.length} emails`,
            );
        } catch (error) {
            this.logger.error(`Reprocess job ${jobId} failed`, error);
            try {
                await this.syncJobRepository.update(jobId, {
                    status: "failed",
                    errorMessage: error instanceof Error ? error.message : "Unknown error",
                    completedAt: new Date(),
                });
            } catch (updateError) {
                this.logger.error(
                    `Critical: Failed to update reprocess job ${jobId} status`,
                    updateError,
                );
                throw error;
            }
        }
    }

    /**
     * Internal method to run the sync job
     */
    private async runSyncJob(
        jobId: string,
        params: { userId: string; query?: string },
    ): Promise<void> {
        let query = params.query;

        // If no custom query, build one based on last sync time
        if (!query) {
            const lastSync = await this.syncJobRepository.findLastCompletedByUserId(params.userId);

            if (lastSync?.completedAt) {
                // Incremental sync: fetch emails since last completed sync
                const afterDate = this.formatGmailAfterTimestamp(lastSync.completedAt, 5);
                query = `subject:(statement OR receipt OR purchase OR transaction OR payment OR invoice OR card OR bank OR upi) after:${afterDate}`;
                this.logger.log(`Incremental sync for user ${params.userId} after ${afterDate}`);
            } else {
                query =
                    "subject:(statement OR receipt OR purchase OR transaction OR payment OR invoice OR card OR bank OR upi) newer_than:180d";
                this.logger.log(`First sync for user ${params.userId}, fetching last 30 days`);
            }
        }

        try {
            // Mark job as processing
            await this.syncJobRepository.update(jobId, {
                status: "processing",
                startedAt: new Date(),
            });

            // Fetch email list
            const emailRefs = await this.gmailProvider.listExpenseEmails({
                userId: params.userId,
                query,
            });

            // Update total count
            await this.syncJobRepository.update(jobId, {
                totalEmails: emailRefs.length,
            });

            this.logger.log(`Sync job ${jobId}: Found ${emailRefs.length} emails to process`);

            let totalTransactions = 0;
            let totalStatements = 0;

            // Load user's merchant category rules once for the entire sync
            const userRules = await this.buildUserCategorizationRules(params.userId);

            // Process emails in batches to avoid N+1 query problem
            const BATCH_SIZE = 100;
            for (let i = 0; i < emailRefs.length; i += BATCH_SIZE) {
                const batch = emailRefs.slice(i, i + BATCH_SIZE);
                const batchIds = batch.map((ref) => ref.id);

                this.logger.debug(
                    `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchIds.length} emails`,
                );

                try {
                    // Fetch entire batch in one go
                    const rawEmails = await this.gmailProvider.fetchEmailContentBatch({
                        userId: params.userId,
                        emailIds: batchIds,
                    });

                    // Process each email in the batch
                    for (const rawEmail of rawEmails) {
                        try {
                            this.logger.debug(
                                `Upserting email ${rawEmail.providerMessageId} for job ${jobId}`,
                            );
                            const { isNew, id: emailId } =
                                await this.rawEmailRepository.upsert(rawEmail);
                            this.logger.debug(
                                `Email ${rawEmail.providerMessageId} upserted: isNew=${isNew}, id=${emailId}`,
                            );

                            // Update progress
                            await this.syncJobRepository.incrementProgress(
                                jobId,
                                "processedEmails",
                            );

                            if (isNew) {
                                await this.syncJobRepository.incrementProgress(jobId, "newEmails");
                            }

                            const emailWithId = { ...rawEmail, id: emailId };
                            const parser = this.findParser(emailWithId);

                            if (parser) {
                                const parsedTransactions = parser.parseTransactions(emailWithId);
                                const transactions = this.categorizeTransactions(
                                    parsedTransactions,
                                    userRules,
                                );

                                if (transactions.length > 0) {
                                    await this.transactionRepository.upsertMany(transactions);
                                    totalTransactions += transactions.length;
                                    await this.syncJobRepository.incrementProgress(
                                        jobId,
                                        "transactions",
                                        transactions.length,
                                    );
                                }

                                if (isNew) {
                                    const statement = parser.parseStatement(emailWithId);
                                    if (statement) {
                                        await this.statementRepository.upsert(statement);
                                        totalStatements++;
                                        await this.syncJobRepository.incrementProgress(
                                            jobId,
                                            "statements",
                                        );
                                    }
                                }
                            }
                        } catch (emailError) {
                            this.logger.warn(
                                `Failed to process email ${rawEmail.providerMessageId} in job ${jobId}`,
                                emailError,
                            );
                            // Continue processing other emails
                        }
                    }
                } catch (batchError) {
                    this.logger.error(
                        `Failed to fetch batch starting at index ${i} in job ${jobId}`,
                        batchError,
                    );
                    // Continue with next batch
                }
            }

            // Mark job as completed
            await this.syncJobRepository.update(jobId, {
                status: "completed",
                completedAt: new Date(),
            });

            this.logger.log(
                `Sync job ${jobId} completed: ${totalTransactions} transactions, ${totalStatements} statements`,
            );
        } catch (error) {
            this.logger.error(`Sync job ${jobId} failed`, error);

            // Use try-catch to ensure job status update doesn't throw
            try {
                await this.syncJobRepository.update(jobId, {
                    status: "failed",
                    errorMessage: error instanceof Error ? error.message : "Unknown error",
                    completedAt: new Date(),
                });
            } catch (updateError) {
                // Last resort: log if even the status update fails
                this.logger.error(
                    `Critical: Failed to update job ${jobId} status to failed`,
                    updateError,
                );
                // Re-throw to be caught by outer catch handler in startSyncJob
                throw error;
            }
        }
    }

    async listExpenseEmails(params: {
        userId: string;
        limit: number;
        offset: number;
    }): Promise<{ data: RawEmail[]; total: number }> {
        const [data, total] = await Promise.all([
            this.rawEmailRepository.listByUser(params),
            this.rawEmailRepository.countByUser(params.userId),
        ]);
        return { data, total };
    }

    async listExpenses(params: {
        userId: string;
        limit: number;
        offset: number;
        filters?: TransactionFilters;
    }): Promise<{ data: Transaction[]; total: number }> {
        const [data, total] = await Promise.all([
            this.transactionRepository.listByUser(params),
            this.transactionRepository.countByUser(params.userId, params.filters),
        ]);
        return { data, total };
    }

    async getTransactionById(params: { userId: string; id: string }): Promise<Transaction | null> {
        return this.transactionRepository.findById(params);
    }

    async updateTransaction(params: {
        userId: string;
        id: string;
        data: UpdateTransactionInput;
    }): Promise<Transaction> {
        return this.transactionRepository.updateById(params);
    }

    /**
     * Get distinct merchants with their most common category, for the user.
     */
    async getDistinctMerchants(userId: string) {
        return this.transactionRepository.getDistinctMerchants(userId);
    }

    /**
     * Bulk update category and subcategory for all transactions of a given merchant.
     */
    async bulkCategorizeByMerchant(params: {
        userId: string;
        merchant: string;
        category: string;
        subcategory: string;
        categoryMetadata?: { icon: string; color: string; parent: string | null };
    }): Promise<{ merchant: string; category: string; subcategory: string; updatedCount: number }> {
        const updatedCount = await this.transactionRepository.bulkCategorizeByMerchant(params);

        // Persist the merchant → category mapping for future syncs
        await this.merchantRuleRepository.upsert({
            userId: params.userId,
            merchant: params.merchant,
            category: params.category,
            subcategory: params.subcategory,
            categoryMetadata: params.categoryMetadata,
        });

        return {
            merchant: params.merchant,
            category: params.category,
            subcategory: params.subcategory,
            updatedCount,
        };
    }

    /**
     * Bulk update fields on multiple transactions by ID.
     */
    async bulkUpdateByIds(params: {
        userId: string;
        ids: string[];
        data: {
            category?: string;
            subcategory?: string;
            transactionMode?: string;
            requiresReview?: boolean;
        };
    }): Promise<{ updatedCount: number }> {
        const updatedCount = await this.transactionRepository.bulkUpdateByIds(params);
        return { updatedCount };
    }

    async getExpenseEmailById(params: { userId: string; id: string }): Promise<RawEmail | null> {
        return this.rawEmailRepository.findById(params);
    }

    // ── Analytics ──

    private computeDateRange(period: AnalyticsPeriod): DateRange {
        const end = new Date();
        const start = new Date();
        switch (period) {
            case "week":
                start.setDate(start.getDate() - 7);
                break;
            case "month":
                start.setMonth(start.getMonth() - 1);
                break;
            case "quarter":
                start.setMonth(start.getMonth() - 3);
                break;
            case "year":
                start.setFullYear(start.getFullYear() - 1);
                break;
        }
        start.setHours(0, 0, 0, 0);
        return { start, end };
    }

    async getSpendingSummary(userId: string, period: AnalyticsPeriod): Promise<SpendingSummary> {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getSpendingSummary({ userId, range });
    }

    async getSpendingByCategory(
        userId: string,
        period: AnalyticsPeriod,
    ): Promise<SpendingByCategoryItem[]> {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getSpendingByCategory({ userId, range });
    }

    async getSpendingByMode(
        userId: string,
        period: AnalyticsPeriod,
    ): Promise<SpendingByModeItem[]> {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getSpendingByMode({ userId, range });
    }

    async getTopMerchants(
        userId: string,
        period: AnalyticsPeriod,
        limit = 10,
    ): Promise<SpendingByMerchantItem[]> {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getTopMerchants({ userId, range, limit });
    }

    async getDailySpending(userId: string, period: AnalyticsPeriod): Promise<DailySpendingItem[]> {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getDailySpending({ userId, range });
    }

    async getMonthlyTrend(userId: string, months = 12): Promise<MonthlyTrendItem[]> {
        return this.transactionRepository.getMonthlyTrend({ userId, months });
    }

    async getSpendingByCard(
        userId: string,
        period: AnalyticsPeriod,
    ): Promise<SpendingByCardItem[]> {
        const range = this.computeDateRange(period);
        const rows = await this.transactionRepository.getSpendingByCard({ userId, range });

        // Enrich with card config metadata + milestone progress
        const enrichedCards = await Promise.all(
            rows.map(async (row) => {
                const resolved = this.cardResolver.resolve(row.cardLast4);
                const milestones = resolved?.milestones
                    ? await this.computeMilestoneProgress(
                          userId,
                          row.cardLast4,
                          resolved.milestones,
                      )
                    : [];

                return {
                    ...row,
                    cardName: resolved?.cardName ?? row.cardName,
                    bank: resolved?.bank ?? row.bank,
                    icon: resolved?.icon ?? row.icon,
                    milestones: milestones.length > 0 ? milestones : undefined,
                };
            }),
        );

        return enrichedCards;
    }

    // ── Extended Analytics ──

    async getDayOfWeekSpending(
        userId: string,
        period: AnalyticsPeriod,
    ): Promise<DayOfWeekSpendingItem[]> {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getDayOfWeekSpending({ userId, range });
    }

    async getCategoryTrend(userId: string, months = 6): Promise<CategoryTrendItem[]> {
        return this.transactionRepository.getCategoryTrend({ userId, months });
    }

    async getPeriodComparison(userId: string, period: AnalyticsPeriod): Promise<PeriodComparison> {
        const currentRange = this.computeDateRange(period);

        // Compute previous period range (same duration, shifted back)
        const durationMs = currentRange.end.getTime() - currentRange.start.getTime();
        const previousRange = {
            start: new Date(currentRange.start.getTime() - durationMs),
            end: new Date(currentRange.start.getTime()),
        };

        const [current, previous] = await Promise.all([
            this.transactionRepository.getPeriodTotals({ userId, range: currentRange }),
            this.transactionRepository.getPeriodTotals({ userId, range: previousRange }),
        ]);

        const pctChange = (curr: number, prev: number) =>
            prev > 0 ? Math.round(((curr - prev) / prev) * 10000) / 100 : curr > 0 ? 100 : 0;

        const currentAvg =
            current.transactionCount > 0 ? current.totalSpent / current.transactionCount : 0;
        const previousAvg =
            previous.transactionCount > 0 ? previous.totalSpent / previous.transactionCount : 0;

        return {
            currentPeriod: {
                totalSpent: current.totalSpent,
                totalReceived: current.totalReceived,
                transactionCount: current.transactionCount,
                avgTransaction: currentAvg,
            },
            previousPeriod: {
                totalSpent: previous.totalSpent,
                totalReceived: previous.totalReceived,
                transactionCount: previous.transactionCount,
                avgTransaction: previousAvg,
            },
            changes: {
                spentChange: pctChange(current.totalSpent, previous.totalSpent),
                receivedChange: pctChange(current.totalReceived, previous.totalReceived),
                countChange: pctChange(current.transactionCount, previous.transactionCount),
                avgChange: pctChange(currentAvg, previousAvg),
            },
        };
    }

    async getCumulativeSpend(
        userId: string,
        period: AnalyticsPeriod,
    ): Promise<CumulativeSpendItem[]> {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getCumulativeSpend({ userId, range });
    }

    async getSavingsRate(userId: string, months = 12): Promise<SavingsRateItem[]> {
        return this.transactionRepository.getSavingsRate({ userId, months });
    }

    async getCardCategoryBreakdown(
        userId: string,
        period: AnalyticsPeriod,
    ): Promise<CardCategoryItem[]> {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getCardCategoryBreakdown({ userId, range });
    }

    async getTopVpas(userId: string, period: AnalyticsPeriod, limit = 10): Promise<TopVpaItem[]> {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getTopVpas({ userId, range, limit });
    }

    async getSpendingVelocity(
        userId: string,
        period: AnalyticsPeriod,
    ): Promise<SpendingVelocityItem[]> {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getSpendingVelocity({ userId, range });
    }

    async getMilestoneEtas(userId: string): Promise<MilestoneEta[]> {
        const allCards = this.cardResolver.getAllCards();
        const results: MilestoneEta[] = [];

        for (const [cardLast4, card] of allCards.entries()) {
            if (!card.milestones || Object.keys(card.milestones).length === 0) continue;

            for (const [id, milestone] of Object.entries(card.milestones)) {
                const duration = milestone.durations[0] ?? "yearly";
                const { start, end } = this.computeMilestoneDateRange(
                    duration,
                    milestone.milestone_start_date,
                    milestone.milestone_end_date,
                );

                const currentSpend = await this.transactionRepository.getCardSpendForRange({
                    userId,
                    cardLast4,
                    range: { start, end },
                });

                const percentage = Math.min(100, (currentSpend / milestone.amount) * 100);
                const remaining = Math.max(0, milestone.amount - currentSpend);

                // Calculate daily rate and ETA
                const elapsedMs = Date.now() - start.getTime();
                const elapsedDays = Math.max(1, elapsedMs / (1000 * 60 * 60 * 24));
                const dailyRate = currentSpend / elapsedDays;

                let daysRemaining: number | null = null;
                let estimatedCompletionDate: string | null = null;
                const periodEndStr = end.toISOString().split("T")[0]!;

                if (dailyRate > 0 && remaining > 0) {
                    daysRemaining = Math.ceil(remaining / dailyRate);
                    const eta = new Date();
                    eta.setDate(eta.getDate() + daysRemaining);
                    estimatedCompletionDate = eta.toISOString().split("T")[0]!;
                } else if (remaining <= 0) {
                    daysRemaining = 0;
                }

                const onTrack =
                    remaining <= 0 ||
                    (estimatedCompletionDate != null && estimatedCompletionDate <= periodEndStr);

                results.push({
                    id,
                    cardLast4,
                    cardName: card.cardName,
                    description: milestone.description,
                    targetAmount: milestone.amount,
                    currentSpend,
                    percentage: Math.round(percentage * 100) / 100,
                    dailyRate: Math.round(dailyRate * 100) / 100,
                    daysRemaining,
                    estimatedCompletionDate,
                    periodEnd: periodEndStr,
                    onTrack,
                });
            }
        }

        return results;
    }

    async getLargestTransactions(
        userId: string,
        period: AnalyticsPeriod,
        limit = 10,
    ): Promise<LargestTransactionItem[]> {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getLargestTransactions({ userId, range, limit });
    }

    // ── Pattern Analytics ──

    async getBusAnalytics(userId: string, period: AnalyticsPeriod) {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getBusAnalytics({ userId, range });
    }

    async getInvestmentAnalytics(userId: string, period: AnalyticsPeriod) {
        const range = this.computeDateRange(period);
        return this.transactionRepository.getInvestmentAnalytics({ userId, range });
    }

    /**
     * Compute milestone progress for a specific card.
     * For each milestone, determines the date range based on duration type
     * (quarterly = current calendar quarter, yearly = custom dates or calendar year),
     * queries actual spend in that range, and calculates progress.
     */
    private async computeMilestoneProgress(
        userId: string,
        cardLast4: string,
        milestones: NonNullable<ReturnType<CardResolver["resolve"]>>["milestones"],
    ): Promise<MilestoneProgress[]> {
        const entries = Object.entries(milestones);
        if (entries.length === 0) return [];

        const results: MilestoneProgress[] = [];

        for (const [id, milestone] of entries) {
            const duration = milestone.durations[0] ?? "yearly";
            const { start, end, label } = this.computeMilestoneDateRange(
                duration,
                milestone.milestone_start_date,
                milestone.milestone_end_date,
            );

            const currentSpend = await this.transactionRepository.getCardSpendForRange({
                userId,
                cardLast4,
                range: { start, end },
            });

            const percentage = Math.min(100, (currentSpend / milestone.amount) * 100);
            const remaining = Math.max(0, milestone.amount - currentSpend);

            results.push({
                id,
                type: milestone.type as "spend" | "fee waiver",
                description: milestone.description,
                targetAmount: milestone.amount,
                currentSpend,
                percentage: Math.round(percentage * 100) / 100,
                remaining,
                periodLabel: label,
                periodStart: start.toISOString().split("T")[0]!,
                periodEnd: end.toISOString().split("T")[0]!,
            });
        }

        return results;
    }

    /**
     * Compute the date range for a milestone based on its duration type.
     * - "quarterly": Current calendar quarter (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)
     * - "yearly" with custom dates: Uses milestone_start_date/milestone_end_date
     * - "yearly" without custom dates: Current calendar year
     */
    private computeMilestoneDateRange(
        duration: string,
        startDate?: string,
        endDate?: string,
    ): { start: Date; end: Date; label: string } {
        const now = new Date();

        if (duration === "quarterly") {
            const quarter = Math.floor(now.getMonth() / 3);
            const quarterNames = ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"];
            const start = new Date(now.getFullYear(), quarter * 3, 1);
            const end = new Date(now.getFullYear(), quarter * 3 + 3, 1);
            return {
                start,
                end,
                label: `Q${quarter + 1} ${now.getFullYear()} (${quarterNames[quarter]})`,
            };
        }

        // Yearly with custom dates
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            const fmtDate = (d: Date) =>
                d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            return {
                start,
                end,
                label: `${fmtDate(start)} – ${fmtDate(end)}`,
            };
        }

        // Yearly default: calendar year
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear() + 1, 0, 1);
        return { start, end, label: `FY ${now.getFullYear()}` };
    }

    private findParser(email: RawEmail): EmailParser | null {
        return this.parsers.find((parser) => parser.canParse(email)) ?? null;
    }

    /**
     * Build a UserCategorizationRules object from the user's persisted
     * merchant → category rules. Called once per sync/reprocess.
     */
    private async buildUserCategorizationRules(
        userId: string,
    ): Promise<UserCategorizationRules | undefined> {
        const rules = await this.merchantRuleRepository.findAllByUser(userId);
        if (rules.length === 0) {
            return undefined;
        }

        const exactMatches: Record<string, string> = {};
        for (const rule of rules) {
            // The categorizer's checkExactMatch lowercases paidTo, so store merchant as-is
            exactMatches[rule.merchant] = rule.category;
        }

        this.logger.debug(`Loaded ${rules.length} merchant category rules for user ${userId}`);

        return { exact_matches: exactMatches };
    }

    private categorizeTransactions(
        transactions: Transaction[],
        userRules?: UserCategorizationRules,
    ): Transaction[] {
        if (transactions.length === 0) {
            return transactions;
        }

        return transactions.map((transaction) => {
            const category = this.transactionCategorizer.categorizeTransaction(
                {
                    id: transaction.id,
                    paid_to: transaction.merchantRaw,
                    vpa: transaction.vpa,
                    transaction_mode: transaction.transactionMode,
                    amount: transaction.amount,
                    transaction_type: transaction.transactionType,
                },
                userRules,
            );

            // Resolve card name from last-4 digits
            const cardName = transaction.cardLast4
                ? this.cardResolver.resolveCardName(transaction.cardLast4)
                : undefined;

            return {
                ...transaction,
                category: category.category,
                subcategory: category.subcategory,
                confidence: category.confidence,
                categorizationMethod: category.method,
                requiresReview: category.requiresReview,
                categoryMetadata: category.categoryMetadata,
                cardName,
            };
        });
    }

    /**
     * Format date for Gmail query (YYYY/MM/DD)
     */
    private formatGmailAfterTimestamp(date: Date, offsetByDays = 0): number {
        const adjusted = new Date(date);
        adjusted.setDate(adjusted.getDate() - offsetByDays);

        return Math.floor(adjusted.getTime() / 1000); // Gmail expects seconds
    }
}
