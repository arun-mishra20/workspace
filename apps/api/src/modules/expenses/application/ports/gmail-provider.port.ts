import type { RawEmail } from "@workspace/domain";

/**
 * Gmail Provider interface
 *
 * Abstracts access to Gmail API (googleapis SDK implementation)
 */
export interface GmailProvider {
  listExpenseEmails(params: {
    userId: string;
    query: string;
    after?: string;
  }): Promise<Array<{ id: string }>>;

  fetchEmailContent(params: {
    userId: string;
    emailId: string;
  }): Promise<RawEmail>;
}

export const GMAIL_PROVIDER = Symbol("GMAIL_PROVIDER");
