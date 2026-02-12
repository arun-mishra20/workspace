import type { Holding } from "@workspace/database";
import type { PortfolioSummary } from "@workspace/domain";

export interface HoldingsRepositoryPort {
    findByUserId(userId: string): Promise<Holding[]>;
    findById(id: string, userId: string): Promise<Holding | null>;
    findBySymbol(symbol: string, userId: string): Promise<Holding | null>;
    create(holding: Omit<Holding, "id" | "createdAt" | "updatedAt">): Promise<Holding>;
    update(id: string, userId: string, data: Partial<Holding>): Promise<Holding>;
    delete(id: string, userId: string): Promise<void>;
    deleteAll(userId: string): Promise<void>;
    deleteByPlatform(userId: string, platform: string): Promise<void>;
    getPortfolioSummary(userId: string): Promise<PortfolioSummary>;
}

export const HOLDINGS_REPOSITORY = Symbol("HOLDINGS_REPOSITORY");
