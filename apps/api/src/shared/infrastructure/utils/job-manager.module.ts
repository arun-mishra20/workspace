import { Global, Module } from '@nestjs/common'

import { JobManager } from '@/shared/infrastructure/utils/job-manager'

@Global()
@Module({
  providers: [JobManager],
  exports: [JobManager],
})
export class JobManagerModule {}
