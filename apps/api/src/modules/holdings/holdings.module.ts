import { Module } from "@nestjs/common";
import { HoldingsController } from "./presentation/controllers/holdings.controller";
import { HoldingsService } from "./application/services/holdings.service";
import { GrowwParserService } from "./application/services/groww-parser.service";
import { HoldingsRepository } from "./infrastructure/repositories/holdings.repository";
import { HOLDINGS_REPOSITORY } from "./application/ports/holdings.repository.port";

@Module({
    controllers: [HoldingsController],
    providers: [
        HoldingsService,
        GrowwParserService,
        {
            provide: HOLDINGS_REPOSITORY,
            useClass: HoldingsRepository,
        },
    ],
    exports: [HoldingsService],
})
export class HoldingsModule {}
