import type { RawEmail, Statement, Transaction } from "@workspace/domain";

/**
 * Email Parser interface
 *
 * Parses raw email content into structured financial data
 */
export interface EmailParser {
  canParse(email: RawEmail): boolean;
  parseTransactions(email: RawEmail): Transaction[];
  parseStatement(email: RawEmail): Statement | null;
}

export const EMAIL_PARSERS = Symbol("EMAIL_PARSERS");
