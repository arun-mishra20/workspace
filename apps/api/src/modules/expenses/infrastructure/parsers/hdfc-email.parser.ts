import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type { EmailParser } from "@/modules/expenses/application/ports/email-parser.port";
import {
    buildTransactionHash,
    deterministicUuidFromHash,
    normalizeMerchant,
    normalizeWhitespace,
} from "@/modules/expenses/infrastructure/parsers/parser-utils";
import type {
    RawEmail,
    Statement,
    Transaction,
    TransactionMode,
    TransactionType,
} from "@workspace/domain";

const LOW_CONFIDENCE_THRESHOLD = 0.7;

interface ParsedHdfcDetails {
    amount: number | null;
    currency: string;
    transactionType: TransactionType | null;
    paidTo: string | null;
    vpa: string | null;
    transactionMode: TransactionMode | null;
    cardLast4: string | null;
    transactionDate: string | null;
    wasDateExtracted: boolean;
}

@Injectable()
export class HdfcEmailParser implements EmailParser {
    canParse(email: RawEmail): boolean {
        const from = email.from.toLowerCase();
        const subject = email.subject.toLowerCase();

        return from.includes("hdfcbank.com") || from.includes("hdfc") || subject.includes("hdfc");
    }

    parseTransactions(email: RawEmail): Transaction[] {
        const details = this.extractDetails(
            email.subject,
            email.bodyText,
            email.snippet,
            email.receivedAt,
        );
        const confidence = this.calculateParsingConfidence(details);

        if (
            confidence < LOW_CONFIDENCE_THRESHOLD ||
            details.amount === null ||
            details.amount <= 0 ||
            details.transactionType === null ||
            details.transactionMode === null
        ) {
            return [];
        }

        // For credit card alert emails the subject often has no merchant info.
        // Use a descriptive fallback so the transaction is still recorded.
        const merchantRaw = details.paidTo
            ? normalizeMerchant(details.paidTo)
            : details.cardLast4
              ? `Card ••${details.cardLast4} Transaction`
              : "Unknown Merchant";
        const merchant = merchantRaw;
        const transactionDate = details.transactionDate ?? email.receivedAt;

        const dedupeHash = buildTransactionHash({
            userId: email.userId,
            sourceEmailId: email.id,
            amount: details.amount,
            currency: details.currency,
            transactionDate,
            transactionType: details.transactionType,
            transactionMode: details.transactionMode,
        });

        return [
            {
                id: deterministicUuidFromHash(dedupeHash),
                userId: email.userId,
                dedupeHash,
                sourceEmailId: email.id,
                merchant,
                merchantRaw,
                vpa: details.vpa ?? undefined,
                amount: details.amount,
                currency: details.currency,
                transactionDate,
                transactionType: details.transactionType,
                transactionMode: details.transactionMode,
                category: "uncategorized",
                subcategory: "uncategorized",
                confidence: 0,
                categorizationMethod: "default",
                requiresReview: true,
                categoryMetadata: {
                    icon: "question-circle",
                    color: "#BDC3C7",
                    parent: null,
                },
                statementId: undefined,
                cardLast4: details.cardLast4 ?? undefined,
            },
        ];
    }

    parseStatement(_email: RawEmail): Statement | null {
        const periodMatch = _email.bodyText.match(
            /statement\s*period\s*[:\-]\s*(.+?)\s*(?:to|-)\s*(.+)/i,
        );
        const totalDue = this.extractStatementAmount(_email.bodyText);

        if (!periodMatch || totalDue === null) {
            return null;
        }

        return {
            id: randomUUID(),
            userId: _email.userId,
            issuer: "HDFC",
            periodStart: periodMatch[1]?.trim() ?? _email.receivedAt,
            periodEnd: periodMatch[2]?.trim() ?? _email.receivedAt,
            totalDue,
            sourceEmailId: _email.id,
        };
    }

    private extractDetails(
        subject: string,
        text: string,
        snippet: string,
        receivedAt: string,
    ): ParsedHdfcDetails {
        const searchableText = `${subject}\n${text}\n${snippet}`;
        const textLower = searchableText.toLowerCase();

        const amount = this.extractAmount(textLower);
        const transactionType = this.extractTransactionType(textLower);
        const { mode: transactionMode, cardLast4 } = this.extractTransactionModeAndCard(textLower);
        const paidTo = this.extractPaidTo(searchableText);
        const vpa = this.extractVpa(searchableText);
        const extractedDate = this.extractTransactionDate(searchableText);
        const transactionDate = extractedDate ?? this.normalizeIsoDate(receivedAt);

        return {
            amount,
            currency: "INR",
            transactionType,
            paidTo,
            vpa,
            transactionMode,
            cardLast4,
            transactionDate,
            wasDateExtracted: extractedDate !== null,
        };
    }

    private extractAmount(textLower: string): number | null {
        const amountPatterns = [
            /rs\.?\s*inr\.?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
            /rs\.?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
            /inr\.?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
            /(?:amount|total|sum).*?rs\.?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
        ];

        for (const pattern of amountPatterns) {
            const match = textLower.match(pattern);
            if (!match?.[1]) {
                continue;
            }

            const parsed = Number(match[1].replace(/,/g, ""));
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }

        return null;
    }

    private extractStatementAmount(text: string): number | null {
        const match = text.match(
            /total\s*due\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
        );
        if (!match?.[1]) {
            return null;
        }

        const parsed = Number(match[1].replace(/,/g, ""));
        return Number.isFinite(parsed) ? parsed : null;
    }

    private extractTransactionType(textLower: string): TransactionType | null {
        if (/\b(debited|debit|sent|paid|spent|withdrawn)\b/i.test(textLower)) {
            return "debited";
        }
        if (
            /\b(credited|credit|received|deposited|added to your account|successfully added)\b/i.test(
                textLower,
            )
        ) {
            return "credited";
        }
        return null;
    }

    private extractTransactionModeAndCard(textLower: string): {
        mode: TransactionMode | null;
        cardLast4: string | null;
    } {
        if (/\bupi\b/i.test(textLower)) {
            return { mode: "upi", cardLast4: null };
        }
        if (/\bneft\b/i.test(textLower)) {
            return { mode: "neft", cardLast4: null };
        }
        if (/\bimps\b/i.test(textLower)) {
            return { mode: "imps", cardLast4: null };
        }
        if (/\brtgs\b/i.test(textLower)) {
            return { mode: "rtgs", cardLast4: null };
        }

        const creditCardPatterns = [
            /credit\s*card.*?(\d{4})/i,
            /\bcc\b.*?(\d{4})/i,
            /card.*?ending.*?(\d{4})/i,
            /\*\*(\d{4})/,
            /debit\s*card.*?(\d{4})/i,
            /\bdc\b.*?(\d{4})/i,
            /atm\s*card.*?(\d{4})/i,
        ];

        for (const pattern of creditCardPatterns) {
            const match = textLower.match(pattern);
            if (match?.[1]) {
                return { mode: "credit_card", cardLast4: match[1] };
            }
        }

        return { mode: null, cardLast4: null };
    }

    private extractPaidTo(text: string): string | null {
        const paidToPatterns = [
            /(?:neft|imps|rtgs)\s+cr-[a-z0-9]+-([A-Z][A-Z0-9\s&.\-]+?)(?:\s+(?:CLIENT|LLP|PVT|PRIVATE|LIMITED))?\s*-/i,
            /towards\s+([A-Z][A-Z0-9\s*,.&\-]+?)(?:\s+on\s+\d|\s+at\s+\d)/i,
            /to\s+vpa\s+[\w.\-]+@[\w]+\s+([A-Z][A-Za-z0-9\s.\-&]+?)(?:\s+on\s+\d)/i,
            /to\s+[\w.\-]+@[\w]+\s+([A-Z][A-Z0-9\s.\-&]+?)(?:\s+on\s+\d)/i,
            /by\s+vpa\s+[\w.\-]+@[\w]+\s+([A-Z][A-Za-z0-9\s.\-&]+?)(?:\s+on\s+\d)/i,
        ];

        for (const pattern of paidToPatterns) {
            const match = text.match(pattern);
            if (!match?.[1]) {
                continue;
            }

            let payee = normalizeWhitespace(match[1]).replace(/[.,;:]+$/g, "");
            payee = payee.replace(/\s+(?:CLIENT\s+ACCO|SEZ|LLP|PVT|LTD|PRIVATE\s+LIMITED)$/i, "");
            if (payee.length > 2) {
                return payee;
            }
        }

        return null;
    }

    private extractTransactionDate(text: string): string | null {
        const datePatterns = [
            /\b(?:on|dated)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i,
            /\b(?:on|dated)\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i,
            /\btxn(?:\.|\s)?date\s*[:\-]?\s*([A-Za-z0-9:/\-\s]{6,30})/i,
            /\btransaction\s*date\s*[:\-]?\s*([A-Za-z0-9:/\-\s]{6,30})/i,
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            const candidate = match?.[1];
            if (!candidate) {
                continue;
            }

            const parsed = this.parseDateCandidate(candidate);
            if (parsed) {
                return parsed;
            }
        }

        return null;
    }

    private extractVpa(text: string): string | null {
        const vpaWithPrefix = text.match(/(?:to|by)\s+vpa\s+([\w.\-]+@[\w]+)/i);
        if (vpaWithPrefix?.[1]) {
            return vpaWithPrefix[1].toLowerCase();
        }

        const vpaWithoutPrefix = text.match(/(?:to|by)\s+([\w.\-]+@[\w]+)/i);
        if (vpaWithoutPrefix?.[1]) {
            return vpaWithoutPrefix[1].toLowerCase();
        }

        return null;
    }

    private parseDateCandidate(candidate: string): string | null {
        const cleaned = normalizeWhitespace(candidate.replace(/,$/, ""));

        const numericMatch = cleaned.match(
            /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
        );
        if (numericMatch) {
            const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw, secondRaw] = numericMatch;
            const day = Number(dayRaw);
            const month = Number(monthRaw);
            const year = this.normalizeYear(Number(yearRaw));
            const hour = hourRaw ? Number(hourRaw) : 0;
            const minute = minuteRaw ? Number(minuteRaw) : 0;
            const second = secondRaw ? Number(secondRaw) : 0;

            if (this.isValidDateParts(year, month, day, hour, minute, second)) {
                return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).toISOString();
            }
        }

        const namedMonthMatch = cleaned.match(
            /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
        );
        if (namedMonthMatch) {
            const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw, secondRaw] = namedMonthMatch;
            const day = Number(dayRaw);
            const month = monthRaw ? this.monthNameToNumber(monthRaw) : null;
            const year = this.normalizeYear(Number(yearRaw));
            const hour = hourRaw ? Number(hourRaw) : 0;
            const minute = minuteRaw ? Number(minuteRaw) : 0;
            const second = secondRaw ? Number(secondRaw) : 0;

            if (month && this.isValidDateParts(year, month, day, hour, minute, second)) {
                return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).toISOString();
            }
        }

        const fallback = new Date(cleaned);
        if (!Number.isNaN(fallback.getTime())) {
            return fallback.toISOString();
        }

        return null;
    }

    private normalizeIsoDate(value: string): string | null {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        return parsed.toISOString();
    }

    private monthNameToNumber(month: string): number | null {
        const key = month.toLowerCase().slice(0, 3);
        const monthMap: Record<string, number> = {
            jan: 1,
            feb: 2,
            mar: 3,
            apr: 4,
            may: 5,
            jun: 6,
            jul: 7,
            aug: 8,
            sep: 9,
            oct: 10,
            nov: 11,
            dec: 12,
        };
        return monthMap[key] ?? null;
    }

    private normalizeYear(year: number): number {
        if (year < 100) {
            return year >= 70 ? 1900 + year : 2000 + year;
        }
        return year;
    }

    private isValidDateParts(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        second: number,
    ): boolean {
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return false;
        }
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
            return false;
        }

        const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day
        );
    }

    private calculateParsingConfidence(details: ParsedHdfcDetails): number {
        let score = 0;
        if (details.amount !== null && details.amount > 0) {
            score += 0.35;
        }
        if (details.transactionType !== null) {
            score += 0.2;
        }
        if (details.transactionMode !== null) {
            score += 0.2;
        }
        if (details.paidTo !== null) {
            score += 0.15;
        }
        if (details.wasDateExtracted) {
            score += 0.1;
        }
        return score;
    }
}
