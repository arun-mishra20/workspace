import { Module } from "@nestjs/common";

import { AuthModule } from "@/modules/auth/auth.module";
import { ExpensesService } from "@/modules/expenses/application/services/expenses.service";
import { GmailOAuthService } from "@/modules/expenses/application/services/gmail-oauth.service";
import { EMAIL_PARSERS } from "@/modules/expenses/application/ports/email-parser.port";
import { GMAIL_PROVIDER } from "@/modules/expenses/application/ports/gmail-provider.port";
import { RAW_EMAIL_REPOSITORY } from "@/modules/expenses/application/ports/raw-email.repository.port";
import { STATEMENT_REPOSITORY } from "@/modules/expenses/application/ports/statement.repository.port";
import { TRANSACTION_REPOSITORY } from "@/modules/expenses/application/ports/transaction.repository.port";
import { SYNC_JOB_REPOSITORY } from "@/modules/expenses/application/ports/sync-job.repository.port";
import { ChaseEmailParser } from "@/modules/expenses/infrastructure/parsers/chase-email.parser";
import { HdfcEmailParser } from "@/modules/expenses/infrastructure/parsers/hdfc-email.parser";
import { GoogleApisGmailProvider } from "@/modules/expenses/infrastructure/providers/googleapis-gmail.provider";
import { RawEmailRepositoryImpl } from "@/modules/expenses/infrastructure/repositories/raw-email.repository";
import { StatementRepositoryImpl } from "@/modules/expenses/infrastructure/repositories/statement.repository";
import { TransactionRepositoryImpl } from "@/modules/expenses/infrastructure/repositories/transaction.repository";
import { SyncJobRepositoryImpl } from "@/modules/expenses/infrastructure/repositories/sync-job.repository";
import { ExpensesController } from "@/modules/expenses/presentation/controllers/expenses.controller";
import { GmailOAuthController } from "@/modules/expenses/presentation/controllers/gmail-oauth.controller";
import { GmailDisconnectController } from "@/modules/expenses/presentation/controllers/gmail-disconnect.controller";

@Module({
    imports: [AuthModule],
    controllers: [ExpensesController, GmailOAuthController, GmailDisconnectController],
    providers: [
        ExpensesService,
        GmailOAuthService,
        ChaseEmailParser,
        HdfcEmailParser,
        {
            provide: EMAIL_PARSERS,
            useFactory: (chase: ChaseEmailParser, hdfc: HdfcEmailParser) => [hdfc, chase],
            inject: [ChaseEmailParser, HdfcEmailParser],
        },
        {
            provide: GMAIL_PROVIDER,
            useClass: GoogleApisGmailProvider,
        },
        {
            provide: TRANSACTION_REPOSITORY,
            useClass: TransactionRepositoryImpl,
        },
        {
            provide: STATEMENT_REPOSITORY,
            useClass: StatementRepositoryImpl,
        },
        {
            provide: RAW_EMAIL_REPOSITORY,
            useClass: RawEmailRepositoryImpl,
        },
        {
            provide: SYNC_JOB_REPOSITORY,
            useClass: SyncJobRepositoryImpl,
        },
    ],
})
export class ExpensesModule {}
