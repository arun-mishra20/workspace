import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { FetchPlaygroundEmailsDto } from '@/modules/playground/presentation/dtos/fetch-playground-emails.dto'
import { EmailSyncService } from '@/shared/application/services/email-sync.service'
import { OffsetListResponseDto } from '@/shared/infrastructure/dtos/list-response.dto'

import type { RawEmail } from '@workspace/domain'
import type { FastifyRequest } from 'fastify'

@ApiTags('playground')
@Controller('playground')
export class PlaygroundController {
  constructor(private readonly emailSyncService: EmailSyncService) {}

  @Post('fetch')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch emails from Gmail for playground preview (no persistence)',
    description: 'Fetches up to 20 emails matching a Gmail query and returns raw email payloads without storing them.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns fetched emails in list format',
  })
  async fetchPlaygroundEmails(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body() dto: FetchPlaygroundEmailsDto,
  ): Promise<OffsetListResponseDto<RawEmail>> {
    const emails = await this.emailSyncService.fetchPreviewEmails({
      userId: req.user.id,
      query: dto.query,
      maxResults: dto.limit,
      category: 'playground',
    })

    return {
      object: 'list',
      data: emails,
      page: 1,
      page_size: dto.limit,
      total: emails.length,
      has_more: false,
    }
  }
}
