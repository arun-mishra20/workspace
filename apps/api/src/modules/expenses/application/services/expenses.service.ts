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
} from "@/modules/expenses/application/ports/transaction.repository.port";
import {
    SYNC_JOB_REPOSITORY,
    type SyncJobRepository,
    type SyncJob,
} from "@/modules/expenses/application/ports/sync-job.repository.port";

import type { RawEmail } from "@workspace/domain";

@Injectable()
export class ExpensesService {
    private readonly logger = new Logger(ExpensesService.name);

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

        // Run the sync in the background (fire and forget)
        this.runSyncJob(job.id, params).catch((error) => {
            this.logger.error(`Sync job ${job.id} failed unexpectedly`, error);
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
     * Internal method to run the sync job
     */
    private async runSyncJob(
        jobId: string,
        params: { userId: string; query?: string },
    ): Promise<void> {
        const query = params.query ?? "subject:(statement OR receipt OR purchase) newer_than:30d";

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

            // Process each email
            for (const ref of emailRefs) {
                try {
                    const rawEmail = await this.gmailProvider.fetchEmailContent({
                        userId: params.userId,
                        emailId: ref.id,
                    });

                    const { isNew, id: emailId } = await this.rawEmailRepository.upsert(rawEmail);

                    // Update progress
                    await this.syncJobRepository.incrementProgress(jobId, "processedEmails");

                    if (isNew) {
                        await this.syncJobRepository.incrementProgress(jobId, "newEmails");

                        // Only parse new emails
                        const emailWithId = { ...rawEmail, id: emailId };
                        const parser = this.findParser(emailWithId);

                        if (parser) {
                            const transactions = parser.parseTransactions(emailWithId);
                            const statement = parser.parseStatement(emailWithId);

                            if (transactions.length > 0) {
                                await this.transactionRepository.upsertMany(transactions);
                                totalTransactions += transactions.length;
                                await this.syncJobRepository.incrementProgress(
                                    jobId,
                                    "transactions",
                                    transactions.length,
                                );
                            }

                            if (statement) {
                                await this.statementRepository.upsert(statement);
                                totalStatements++;
                                await this.syncJobRepository.incrementProgress(jobId, "statements");
                            }
                        }
                    }
                } catch (emailError) {
                    this.logger.warn(
                        `Failed to process email ${ref.id} in job ${jobId}`,
                        emailError,
                    );
                    // Continue processing other emails
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

            await this.syncJobRepository.update(jobId, {
                status: "failed",
                errorMessage: error instanceof Error ? error.message : "Unknown error",
                completedAt: new Date(),
            });
        }
    }

    async listExpenseEmails(params: {
        userId: string;
        limit: number;
        offset: number;
    }): Promise<RawEmail[]> {
        return this.rawEmailRepository.listByUser(params);
    }

    private findParser(email: RawEmail): EmailParser | null {
        return this.parsers.find((parser) => parser.canParse(email)) ?? null;
    }
}
