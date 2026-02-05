import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type { EmailParser } from "@/modules/expenses/application/ports/email-parser.port";
import type { RawEmail, Statement, Transaction } from "@workspace/domain";

@Injectable()
export class ChaseEmailParser implements EmailParser {
  canParse(email: RawEmail): boolean {
    return email.from.toLowerCase().includes("chase.com");
  }

  parseTransactions(email: RawEmail): Transaction[] {
    const amount = this.extractAmount(email.bodyText);
    const merchant = this.extractField(email.bodyText, /merchant:\s*(.+)/i);
    const transactionDate =
      this.extractField(email.bodyText, /date:\s*(.+)/i) ?? email.receivedAt;

    if (!amount || !merchant) {
      return [];
    }

    return [
      {
        id: randomUUID(),
        userId: email.userId,
        merchant,
        amount,
        currency: "USD",
        transactionDate,
        category: undefined,
        statementId: undefined,
        sourceEmailId: email.id,
      },
    ];
  }

  parseStatement(email: RawEmail): Statement | null {
    const periodMatch = email.bodyText.match(/statement period:\s*(.+?)\s*-\s*(.+)/i);
    const totalDue = this.extractAmount(email.bodyText, /total due:\s*\$?([\d,.]+)/i);

    if (!periodMatch || !totalDue) {
      return null;
    }

    return {
      id: randomUUID(),
      userId: email.userId,
      issuer: "Chase",
      periodStart: periodMatch[1]?.trim() ?? email.receivedAt,
      periodEnd: periodMatch[2]?.trim() ?? email.receivedAt,
      totalDue,
      sourceEmailId: email.id,
    };
  }

  private extractAmount(text: string, pattern = /amount:\s*\$?([\d,.]+)/i): number | null {
    const match = text.match(pattern);
    if (!match?.[1]) {
      return null;
    }

    const normalized = match[1].replace(/,/g, "");
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
  }

  private extractField(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    if (!match?.[1]) {
      return null;
    }

    return match[1].trim();
  }
}
