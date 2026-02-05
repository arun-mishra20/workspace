import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";

import {
    Inject,
    Injectable,
    RequestTimeoutException,
    UnauthorizedException,
    Logger,
    BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";

import { AuthIdentityDto } from "@/modules/auth/application/dtos/auth-identity.dto";
import { AUTH_IDENTITY_REPOSITORY } from "@/modules/auth/application/ports/auth-identity.repository.port";

import type { Env } from "@/app/config/env.schema";
import type { AuthIdentityRepository } from "@/modules/auth/application/ports/auth-identity.repository.port";
import type { AuthProvider } from "@/modules/auth/application/constants/auth-provider";

const MAX_STATE_AGE_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

interface OAuthState {
    userId: string;
    nonce: string;
    ts: number;
}

@Injectable()
export class GmailOAuthService {
    private readonly logger = new Logger(GmailOAuthService.name);
    private readonly provider: AuthProvider = "google";

    constructor(
        @Inject(AUTH_IDENTITY_REPOSITORY)
        private readonly authIdentityRepo: AuthIdentityRepository,
        private readonly configService: ConfigService<Env, true>,
    ) {}

    getAuthUrl(userId: string): string {
        const oauth2Client = this.createOAuthClient();
        const state = this.signState({
            userId,
            nonce: randomUUID(),
            ts: Date.now(),
        });

        return oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            include_granted_scopes: true,
            scope: [
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/userinfo.email",
            ],
            state,
        });
    }

    async handleCallback(params: { code: string; state: string }) {
        const state = this.verifyState(params.state);
        const oauth2Client = this.createOAuthClient();

        const { tokens } = await oauth2Client.getToken(params.code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        if (!userInfo.data.email) {
            throw new BadRequestException("Unable to retrieve email from Google");
        }

        const email = userInfo.data.email.toLowerCase();
        const now = new Date();

        const existing = await this.authIdentityRepo.findByUserIdAndProvider(
            state.userId,
            this.provider,
        );

        // Preserve existing refresh token if new one isn't provided
        // Google only returns refresh_token on first auth or forced consent
        const identity = new AuthIdentityDto({
            id: existing?.id ?? randomUUID(),
            userId: state.userId,
            providerId: this.provider,
            accountId: email,
            password: null,
            accessToken: tokens.access_token ?? null,
            refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
            accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            refreshTokenExpiresAt: existing?.refreshTokenExpiresAt ?? null,
            scope: tokens.scope ?? existing?.scope ?? null,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        });

        // Warn if we don't have a refresh token (shouldn't happen with prompt: 'consent')
        if (!identity.refreshToken) {
            this.logger.warn(
                `No refresh token available for user ${state.userId}. User may need to re-authenticate.`,
            );
        }

        await this.authIdentityRepo.save(identity);

        this.logger.log(`OAuth callback completed for user ${state.userId}, email: ${email}`);

        return { email };
    }

    async getStatus(userId: string): Promise<{ connected: boolean; email?: string | null }> {
        const identity = await this.withTimeout(
            this.authIdentityRepo.findByUserIdAndProvider(userId, this.provider),
            5000,
            "gmail-status",
        );

        this.logger.debug(`Status check for user ${userId}`, {
            identityFound: !!identity,
            hasRefreshToken: Boolean(identity?.refreshToken),
            email: identity?.accountId,
        });

        return {
            connected: Boolean(identity?.refreshToken),
            email: identity?.accountId ?? null,
        };
    }

    async disconnect(userId: string): Promise<{ connected: boolean; email?: string | null }> {
        const identity = await this.withTimeout(
            this.authIdentityRepo.findByUserIdAndProvider(userId, this.provider),
            5000,
            "gmail-disconnect",
        );

        if (!identity) {
            this.logger.debug(`No identity found to disconnect for user ${userId}`);
            return { connected: false, email: null };
        }

        this.logger.log(`Disconnecting Gmail for user ${userId}`, {
            identityId: identity.id,
            email: identity.accountId,
        });

        // Revoke the token with Google before deleting locally
        try {
            if (identity.accessToken) {
                const oauth2Client = this.createOAuthClient();
                oauth2Client.setCredentials({ access_token: identity.accessToken });
                await oauth2Client.revokeCredentials();
                this.logger.log(`Successfully revoked Google tokens for user ${userId}`);
            }
        } catch (error) {
            // Log but don't fail - we still want to delete locally even if revocation fails
            this.logger.warn(`Failed to revoke Google tokens for user ${userId}`, error);
        }

        const deleted = await this.authIdentityRepo.delete(identity.id);
        this.logger.log(`Deleted identity for user ${userId}`, {
            deleted,
            identityId: identity.id,
        });

        return { connected: false, email: null };
    }

    /**
     * Get a valid access token, refreshing if necessary
     */
    async getValidAccessToken(userId: string): Promise<string> {
        const identity = await this.authIdentityRepo.findByUserIdAndProvider(userId, this.provider);

        if (!identity?.refreshToken) {
            throw new UnauthorizedException("Gmail not connected. Please authenticate first.");
        }

        // Check if token needs refresh
        const needsRefresh =
            !identity.accessToken ||
            !identity.accessTokenExpiresAt ||
            Date.now() >= identity.accessTokenExpiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS;

        if (!needsRefresh) {
            return identity.accessToken!;
        }

        // Refresh the token
        this.logger.log(`Refreshing access token for user ${userId}`);
        const oauth2Client = this.createOAuthClient();
        oauth2Client.setCredentials({
            refresh_token: identity.refreshToken,
        });

        try {
            const { credentials } = await oauth2Client.refreshAccessToken();

            // Update stored credentials
            const now = new Date();
            const updatedIdentity = new AuthIdentityDto({
                ...identity,
                accessToken: credentials.access_token ?? identity.accessToken,
                refreshToken: credentials.refresh_token ?? identity.refreshToken,
                accessTokenExpiresAt: credentials.expiry_date
                    ? new Date(credentials.expiry_date)
                    : null,
                scope: credentials.scope ?? identity.scope,
                updatedAt: now,
            });

            await this.authIdentityRepo.save(updatedIdentity);

            if (!updatedIdentity.accessToken) {
                throw new UnauthorizedException("Failed to refresh access token");
            }

            this.logger.log(`Successfully refreshed access token for user ${userId}`);
            return updatedIdentity.accessToken;
        } catch (error) {
            this.logger.error(`Failed to refresh access token for user ${userId}`, error);
            throw new UnauthorizedException(
                "Failed to refresh Gmail access token. Please re-authenticate.",
            );
        }
    }

    /**
     * Get an authenticated OAuth2 client for making Gmail API calls
     */
    async getAuthenticatedClient(userId: string) {
        const accessToken = await this.getValidAccessToken(userId);
        const oauth2Client = this.createOAuthClient();
        oauth2Client.setCredentials({ access_token: accessToken });
        return oauth2Client;
    }

    private createOAuthClient() {
        const clientId = this.configService.get("GMAIL_CLIENT_ID", { infer: true });
        const clientSecret = this.configService.get("GMAIL_CLIENT_SECRET", { infer: true });
        const redirectUri = this.configService.get("GMAIL_REDIRECT_URI", { infer: true });

        if (!clientId || !clientSecret || !redirectUri) {
            throw new Error("Missing Gmail OAuth configuration");
        }

        return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    }

    private signState(payload: OAuthState): string {
        const secret = this.configService.get("JWT_SECRET", { infer: true });
        const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
        const signature = createHmac("sha256", secret).update(encodedPayload).digest();
        const encodedSignature = this.base64UrlEncode(signature);

        return `${encodedPayload}.${encodedSignature}`;
    }

    private verifyState(state: string): OAuthState {
        const secret = this.configService.get("JWT_SECRET", { infer: true });
        const [encodedPayload, encodedSignature] = state.split(".");

        if (!encodedPayload || !encodedSignature) {
            throw new UnauthorizedException("Invalid OAuth state format");
        }

        // Verify signature
        const expected = createHmac("sha256", secret).update(encodedPayload).digest();
        const actual = this.base64UrlDecode(encodedSignature);

        if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
            throw new UnauthorizedException("Invalid OAuth state signature");
        }

        // Decode and parse payload
        const decoded = this.base64UrlDecode(encodedPayload).toString("utf-8");
        const payload = JSON.parse(decoded) as OAuthState;

        // Validate timestamp to prevent replay attacks
        const stateAge = Date.now() - payload.ts;
        if (stateAge > MAX_STATE_AGE_MS) {
            throw new UnauthorizedException(
                `OAuth state expired (age: ${Math.round(stateAge / 1000)}s)`,
            );
        }

        if (stateAge < 0) {
            throw new UnauthorizedException("OAuth state timestamp is in the future");
        }

        return payload;
    }

    private base64UrlEncode(data: string | Buffer): string {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf-8");
        return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    private base64UrlDecode(data: string): Buffer {
        const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        return Buffer.from(padded, "base64");
    }

    private async withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
        let timeoutId: NodeJS.Timeout | undefined;
        try {
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new RequestTimeoutException(`${label} timed out after ${ms}ms`));
                }, ms);
            });

            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }
}
