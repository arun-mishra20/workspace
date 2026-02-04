import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";
import { randomUUID } from "node:crypto";

import type { GmailProvider } from "@/modules/expenses/application/ports/gmail-provider.port";
import type { RawEmail } from "@workspace/domain";
import { AUTH_IDENTITY_REPOSITORY } from "@/modules/auth/application/ports/auth-identity.repository.port";

import type { AuthIdentityRepository } from "@/modules/auth/application/ports/auth-identity.repository.port";
import type { Env } from "@/app/config/env.schema";

@Injectable()
export class GoogleApisGmailProvider implements GmailProvider {
    private readonly gmail = google.gmail("v1");
    private readonly logger = new Logger(GoogleApisGmailProvider.name);

    constructor(
        @Inject(AUTH_IDENTITY_REPOSITORY)
        private readonly authIdentityRepo: AuthIdentityRepository,
        private readonly configService: ConfigService<Env, true>,
    ) {}

    async listExpenseEmails(params: {
        userId: string;
        query: string;
        after?: string;
    }): Promise<Array<{ id: string }>> {
        const oauth2Client = await this.getOAuthClient(params.userId);
        const res = await this.gmail.users.messages.list({
            auth: oauth2Client,
            userId: "me",
            q: params.query,
            pageToken: params.after,
        });

        console.log("Gmail API response: listExpenseEmails", res.data);

        return (res.data.messages ?? [])
            .filter((message): message is { id: string } => Boolean(message?.id))
            .map((message) => ({ id: message.id }));
    }

    async fetchEmailContent(params: { userId: string; emailId: string }): Promise<RawEmail> {
        const oauth2Client = await this.getOAuthClient(params.userId);
        const res = await this.gmail.users.messages.get({
            auth: oauth2Client,
            userId: "me",
            id: params.emailId,
            format: "full",
        });

        const payload = res.data.payload;
        const headers = this.headersToRecord(payload?.headers ?? []);
        const bodyText = this.extractBody(payload, "text/plain") ?? "";
        const bodyHtml = this.extractBody(payload, "text/html") ?? undefined;

        console.log("Gmail API response: fetchEmailContent", res.data);

        return {
            id: randomUUID(),
            userId: params.userId,
            provider: "gmail",
            providerMessageId: params.emailId,
            from: headers.from ?? "",
            subject: headers.subject ?? "",
            receivedAt: headers.date ?? new Date().toISOString(),
            bodyText,
            bodyHtml,
            rawHeaders: headers,
        };
    }

    private headersToRecord(headers: Array<{ name?: string | null; value?: string | null }>) {
        return headers.reduce<Record<string, string>>((acc, header) => {
            if (header.name && header.value) {
                acc[header.name.toLowerCase()] = header.value;
            }
            return acc;
        }, {});
    }

    private extractBody(payload: any, mimeType: string): string | null {
        if (!payload) {
            return null;
        }

        if (payload.mimeType === mimeType && payload.body?.data) {
            return this.decodeBase64Url(payload.body.data);
        }

        for (const part of payload.parts ?? []) {
            const found = this.extractBody(part, mimeType);
            if (found) {
                return found;
            }
        }

        return null;
    }

    private decodeBase64Url(data: string): string {
        const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
        const buffer = Buffer.from(normalized, "base64");
        return buffer.toString("utf-8");
    }

    private async getOAuthClient(userId: string) {
        const identity = await this.authIdentityRepo.findByUserIdAndProvider(userId, "google");
        if (!identity?.refreshToken) {
            throw new Error("Gmail account not connected");
        }

        this.logger.debug(`Checking Gmail scopes for user ${userId}`, {
            storedScope: identity.scope,
            hasGmailScope: this.hasGmailScope(identity.scope),
        });

        if (!this.hasGmailScope(identity.scope)) {
            throw new Error("Gmail scopes missing. Please reconnect Gmail with mail access.");
        }

        const clientId = this.configService.get("GMAIL_CLIENT_ID", { infer: true });
        const clientSecret = this.configService.get("GMAIL_CLIENT_SECRET", { infer: true });
        const redirectUri = this.configService.get("GMAIL_REDIRECT_URI", { infer: true });

        if (!clientId || !clientSecret || !redirectUri) {
            throw new Error("Missing Gmail OAuth configuration");
        }

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        oauth2Client.setCredentials({
            refresh_token: identity.refreshToken,
            access_token: identity.accessToken ?? undefined,
            expiry_date: identity.accessTokenExpiresAt?.getTime(),
        });

        return oauth2Client;
    }

    private hasGmailScope(scope: string | null): boolean {
        if (!scope) {
            return false;
        }

        // Check for gmail.readonly scope - handle both full URL and short form
        const scopes = scope.split(/\s+/);
        return scopes.some(
            (s) =>
                s === "https://www.googleapis.com/auth/gmail.readonly" ||
                s === "gmail.readonly" ||
                s.includes("gmail.readonly"),
        );
    }
}
