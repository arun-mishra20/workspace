import { Module } from '@nestjs/common'

import { HOLDINGS_REPOSITORY } from './application/ports/holdings.repository.port'
import { GrowwParserService } from './application/services/groww-parser.service'
import { HoldingsService } from './application/services/holdings.service'
import { HoldingsRepository } from './infrastructure/repositories/holdings.repository'
import { HoldingsController } from './presentation/controllers/holdings.controller'

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
