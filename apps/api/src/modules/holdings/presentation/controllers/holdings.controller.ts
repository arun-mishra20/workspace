import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'

import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard'

import { HoldingsService } from '../../application/services/holdings.service'

import type { CreateHolding } from '@workspace/domain'
import type { FastifyRequest } from 'fastify'

@ApiTags('Holdings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('holdings')
export class HoldingsController {
  constructor(private readonly holdingsService: HoldingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all holdings for current user' })
  async getHoldings(@Request() req: FastifyRequest & { user: { id: string } }) {
    return this.holdingsService.getHoldings(req.user.id)
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get portfolio summary' })
  async getPortfolioSummary(@Request() req: FastifyRequest & { user: { id: string } }) {
    return this.holdingsService.getPortfolioSummary(req.user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get holding by ID' })
  async getHolding(
    @Param('id') id: string,
    @Request() req: FastifyRequest & { user: { id: string } },
  ) {
    return this.holdingsService.getHolding(id, req.user.id)
  }

  @Post()
  @ApiOperation({ summary: 'Create new holding' })
  async createHolding(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body() data: CreateHolding,
  ) {
    return this.holdingsService.createHolding(req.user.id, data)
  }

  @Post('import/groww')
  @ApiOperation({ summary: 'Import holdings from Groww JSON' })
  async importFromGroww(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body() body: { json: string },
  ) {
    return this.holdingsService.importFromGroww(req.user.id, body.json)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update holding' })
  async updateHolding(
    @Param('id') id: string,
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body() data: Partial<CreateHolding>,
  ) {
    return this.holdingsService.updateHolding(id, req.user.id, data)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete holding' })
  async deleteHolding(
    @Param('id') id: string,
    @Request() req: FastifyRequest & { user: { id: string } },
  ) {
    await this.holdingsService.deleteHolding(id, req.user.id)
    return { message: 'Holding deleted successfully' }
  }
}
