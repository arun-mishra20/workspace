import { Module } from '@nestjs/common'

import { INVESTMENT_PLAN_REPOSITORY } from '@/modules/investment-plans/application/ports/investment-plan.repository.port'
import { InvestmentPlansService } from '@/modules/investment-plans/application/services/investment-plans.service'
import { InvestmentPlansRepository } from '@/modules/investment-plans/infrastructure/repositories/investment-plans.repository'
import { InvestmentPlansController } from '@/modules/investment-plans/presentation/controllers/investment-plans.controller'

@Module({
  controllers: [InvestmentPlansController],
  providers: [
    InvestmentPlansService,
    { provide: INVESTMENT_PLAN_REPOSITORY, useClass: InvestmentPlansRepository },
  ],
})
export class InvestmentPlansModule {}
