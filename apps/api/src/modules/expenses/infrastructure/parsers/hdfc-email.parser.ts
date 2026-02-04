import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type { EmailParser } from "@/modules/expenses/application/ports/email-parser.port";
import type { RawEmail, Statement, Transaction } from "@workspace/domain";

@Injectable()
export class HdfcEmailParser implements EmailParser {
  canParse(email: RawEmail): boolean {
    const from = email.from.toLowerCase();
    const subject = email.subject.toLowerCase();

    return (
      from.includes("hdfcbank.com") ||
      from.includes("alerts@hdfcbank") ||
      subject.includes("hdfc")
    );
  }

  parseTransactions(email: RawEmail): Transaction[] {
    const text = email.bodyText;

    const amount = this.extractAmount(text);
    const merchant = this.extractMerchant(text);
    const transactionDate = this.extractDate(text) ?? email.receivedAt;
    const currency = this.extractCurrency(text) ?? "INR";

    if (!amount || !merchant) {
      return [];
    }

    return [
      {
        id: randomUUID(),
        userId: email.userId,
        merchant,
        amount,
        currency,
        transactionDate,
        category: undefined,
        statementId: undefined,
        sourceEmailId: email.id,
      },
    ];
  }

  parseStatement(email: RawEmail): Statement | null {
    const text = email.bodyText;
    const period = text.match(/statement\s*period\s*[:\-]\s*(.+?)\s*to\s*(.+)/i);
    const totalDue = this.extractAmount(text, /total\s*due\s*[:\-]\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i);

    if (!period || !totalDue) {
      return null;
    }

    return {
      id: randomUUID(),
      userId: email.userId,
      issuer: "HDFC",
      periodStart: period[1]?.trim() ?? email.receivedAt,
      periodEnd: period[2]?.trim() ?? email.receivedAt,
      totalDue,
      sourceEmailId: email.id,
    };
  }

  private extractAmount(text: string, pattern?: RegExp): number | null {
    const regex =
      pattern ??
      /(amount|amt)\s*(?:debited|spent|paid)?\s*[:\-]\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i;

    const match = text.match(regex);
    const value = match?.[2] ?? match?.[1];
    if (!value) {
      return null;
    }

    const normalized = value.replace(/,/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractMerchant(text: string): string | null {
    const patterns = [
      /merchant\s*[:\-]\s*(.+)/i,
      /at\s+([A-Za-z0-9 &._-]+)/i,
      /spent\s+at\s+([A-Za-z0-9 &._-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractDate(text: string): string | null {
    const match = text.match(/(date|on)\s*[:\-]?\s*([A-Za-z0-9,\-/ ]{6,})/i);
    if (!match?.[2]) {
      return null;
    }

    return match[2].trim();
  }

  private extractCurrency(text: string): string | null {
    if (text.includes("₹") || /INR/i.test(text)) {
      return "INR";
    }

    return null;
  }
}
