import { Module } from '@nestjs/common'

import { PlaygroundController } from '@/modules/playground/presentation/controllers/playground.controller'
import { SharedEmailSyncModule } from '@/shared/shared-email-sync.module'

@Module({
  imports: [SharedEmailSyncModule],
  controllers: [PlaygroundController],
})
export class PlaygroundModule {}
