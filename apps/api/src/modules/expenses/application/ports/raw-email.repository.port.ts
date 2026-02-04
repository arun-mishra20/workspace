import type { RawEmail } from "@workspace/domain";

/**
 * Raw Email Repository interface
 *
 * Stores raw email payloads for reprocessing
 */
export interface RawEmailRepository {
    upsert(email: RawEmail): Promise<{ isNew: boolean; id: string }>;
    findByProviderMessageId(params: {
        userId: string;
        provider: "gmail" | "outlook";
        providerMessageId: string;
    }): Promise<RawEmail | null>;
    listByUser(params: { userId: string; limit: number; offset: number }): Promise<RawEmail[]>;
}

export const RAW_EMAIL_REPOSITORY = Symbol("RAW_EMAIL_REPOSITORY");
