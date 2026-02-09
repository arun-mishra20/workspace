import { describe, expect, it } from "vitest";

import { HdfcEmailParser } from "@/modules/expenses/infrastructure/parsers/hdfc-email.parser";
import type { RawEmail } from "@workspace/domain";

const baseEmail: RawEmail = {
    id: "2dd5cc94-e026-47f2-95b5-29181de13945",
    userId: "user-1",
    provider: "gmail",
    providerMessageId: "message-1",
    from: "alerts@hdfcbank.com",
    subject: "HDFC Transaction Alert",
    snippet:
        "Rs. INR 1,234.50 is debited from your account XX2014 for UPI txn to VPA paytm.s1j0hcc@pty GREEN CHOICE FRUITS AND VEGETABLES on 15 Jan 2025.",
    receivedAt: "2025-01-15T08:00:00.000Z",
    bodyText:
        "Rs. INR 1,234.50 is debited from your account XX2014 for UPI txn to VPA paytm.s1j0hcc@pty GREEN CHOICE FRUITS AND VEGETABLES on 15 Jan 2025.",
    bodyHtml: undefined,
    rawHeaders: {},
};

describe("HdfcEmailParser", () => {
    it("detects HDFC emails using sender or subject", () => {
        const parser = new HdfcEmailParser();

        expect(parser.canParse(baseEmail)).toBe(true);
        expect(
            parser.canParse({
                ...baseEmail,
                from: "alerts@bank.example.com",
                subject: "Your HDFC statement is ready",
            }),
        ).toBe(true);
    });

    it("parses deterministic transactions with robust INR extraction", () => {
        const parser = new HdfcEmailParser();

        const firstRun = parser.parseTransactions(baseEmail);
        const secondRun = parser.parseTransactions(baseEmail);

        expect(firstRun).toHaveLength(1);
        expect(secondRun).toHaveLength(1);

        const first = firstRun[0]!;
        const second = secondRun[0]!;

        expect(first.amount).toBe(1234.5);
        expect(first.currency).toBe("INR");
        expect(first.transactionType).toBe("debited");
        expect(first.transactionMode).toBe("upi");
        expect(first.merchantRaw).toBe("GREEN CHOICE FRUITS AND VEGETABLES");
        expect(first.vpa).toBe("paytm.s1j0hcc@pty");
        expect(first.transactionDate).toBe("2025-01-15T00:00:00.000Z");
        expect(first.id).toBe(second.id);
        expect(first.dedupeHash).toBe(second.dedupeHash);
    });

    it("returns zero transactions when parsing confidence is low", () => {
        const parser = new HdfcEmailParser();

        const transactions = parser.parseTransactions({
            ...baseEmail,
            bodyText: "HDFC update: account notification only.",
            snippet: "HDFC update: account notification only.",
        });

        expect(transactions).toHaveLength(0);
    });

    it("parses RuPay Credit Card UPI transactions correctly", () => {
        const parser = new HdfcEmailParser();

        const rupayEmail: RawEmail = {
            ...baseEmail,
            subject: "❗ You have done a UPI txn. Check details!",
            bodyText:
                "Dear Customer,\n\nRs.60.00 has been debited from your HDFC Bank RuPay Credit Card XX2312 to bmtc.ka01ar4188@cnrb KA01AR4188 on 07-02-26. Your UPI transaction reference number is 118317224974.\n\nIf you did not authorize this transaction, please report it immediately by calling 18002586161 Or SMS BLOCK CC 2312 to 7308080808.\n\nWarm Regards,\nHDFC Bank",
            snippet:
                "Rs.60.00 has been debited from your HDFC Bank RuPay Credit Card XX2312 to bmtc.ka01ar4188@cnrb KA01AR4188 on 07-02-26.",
            receivedAt: "2026-02-07T10:30:00.000Z",
        };

        const transactions = parser.parseTransactions(rupayEmail);

        expect(transactions).toHaveLength(1);

        const txn = transactions[0]!;
        expect(txn.amount).toBe(60.0);
        expect(txn.currency).toBe("INR");
        expect(txn.transactionType).toBe("debited");
        expect(txn.transactionMode).toBe("upi");
        expect(txn.cardLast4).toBe("2312");
        expect(txn.merchantRaw).toBe("KA01AR4188");
        expect(txn.vpa).toBe("bmtc.ka01ar4188@cnrb");
        expect(txn.transactionDate).toBe("2026-02-07T00:00:00.000Z");
    });
});
