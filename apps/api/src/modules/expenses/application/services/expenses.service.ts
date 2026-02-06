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
    type DateRange,
} from "@/modules/expenses/application/ports/transaction.repository.port";
import {
    SYNC_JOB_REPOSITORY,
    type SyncJobRepository,
    type SyncJob,
} from "@/modules/expenses/application/ports/sync-job.repository.port";
import { TransactionCategorizer } from "@/modules/expenses/infrastructure/categorization/transaction-categorizer";
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

            for (const email of allEmails) {
                try {
                    const parser = this.findParser(email);
                    if (!parser) {
                        await this.syncJobRepository.incrementProgress(jobId, "processedEmails");
                        continue;
                    }

                    const parsedTransactions = parser.parseTransactions(email);
                    const transactions = this.categorizeTransactions(parsedTransactions);

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
                    this.logger.warn(
                        `Reprocess job ${jobId}: failed to process email ${email.id}`,
                        emailError,
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
                const afterDate = this.formatGmailDate(lastSync.completedAt);
                query = `subject:(statement OR receipt OR purchase OR transaction OR payment OR invoice OR card OR bank) after:${afterDate}`;
                this.logger.log(`Incremental sync for user ${params.userId} after ${afterDate}`);
            } else {
                // First sync: fetch emails from last 6 months
                query =
                    "subject:(statement OR receipt OR purchase OR transaction OR payment OR invoice OR card OR bank) newer_than:180d";
                this.logger.log(`First sync for user ${params.userId}, fetching last 6 months`);
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
                                const transactions =
                                    this.categorizeTransactions(parsedTransactions);

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
    }): Promise<{ data: Transaction[]; total: number }> {
        const [data, total] = await Promise.all([
            this.transactionRepository.listByUser(params),
            this.transactionRepository.countByUser(params.userId),
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

        // Enrich with card config metadata
        return rows.map((row) => {
            const resolved = this.cardResolver.resolve(row.cardLast4);
            return {
                ...row,
                cardName: resolved?.cardName ?? row.cardName,
                bank: resolved?.bank ?? row.bank,
                icon: resolved?.icon ?? row.icon,
            };
        });
    }

    private findParser(email: RawEmail): EmailParser | null {
        return this.parsers.find((parser) => parser.canParse(email)) ?? null;
    }

    private categorizeTransactions(transactions: Transaction[]): Transaction[] {
        if (transactions.length === 0) {
            return transactions;
        }

        return transactions.map((transaction) => {
            const category = this.transactionCategorizer.categorizeTransaction({
                id: transaction.id,
                paid_to: transaction.merchantRaw,
                vpa: transaction.vpa,
                transaction_mode: transaction.transactionMode,
                amount: transaction.amount,
                transaction_type: transaction.transactionType,
            });

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
    private formatGmailDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}/${month}/${day}`;
    }
}
