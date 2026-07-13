import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { ZodValidationPipe } from '@/app/pipes/zod-validation.pipe'
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard'
import { InvestmentPlansService } from '@/modules/investment-plans/application/services/investment-plans.service'
import {
  CreateInvestmentPlanSchema,
  ReplaceInvestmentPlanSchema,
} from '@/modules/investment-plans/presentation/dtos/investment-plans.schema'

import type {
  CreateInvestmentPlanInput,
  ReplaceInvestmentPlanInput,
} from '@/modules/investment-plans/presentation/dtos/investment-plans.schema'
import type { FastifyRequest } from 'fastify'

@ApiTags('Investment plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investment-plans')
export class InvestmentPlansController {
  constructor(private readonly service: InvestmentPlansService) {}

  @Get()
  @ApiOperation({ summary: 'List investment plans' })
  @ApiResponse({ status: 200, description: 'Returns plan summaries for the authenticated user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  list(@Request() request: FastifyRequest & { user: { id: string } }) {
    return this.service.list(request.user.id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an investment plan' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  create(
    @Request() request: FastifyRequest & { user: { id: string } },
    @Body(new ZodValidationPipe(CreateInvestmentPlanSchema)) body: CreateInvestmentPlanInput,
  ) {
    return this.service.create(request.user.id, body)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an investment plan' })
  @ApiResponse({ status: 200, description: 'Returns the full plan configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  get(@Param('id') id: string, @Request() request: FastifyRequest & { user: { id: string } }) {
    return this.service.get(id, request.user.id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace an investment plan using optimistic concurrency' })
  @ApiResponse({ status: 200, description: 'Plan replaced; revision incremented' })
  @ApiResponse({ status: 400, description: 'Path and body plan IDs do not match' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 409, description: 'Revision conflict' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  replace(
    @Param('id') id: string,
    @Request() request: FastifyRequest & { user: { id: string } },
    @Body(new ZodValidationPipe(ReplaceInvestmentPlanSchema)) body: ReplaceInvestmentPlanInput,
  ) {
    return this.service.replace(id, request.user.id, body.revision, body.plan)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an investment plan' })
  @ApiResponse({ status: 204, description: 'Plan deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async delete(@Param('id') id: string, @Request() request: FastifyRequest & { user: { id: string } }) {
    await this.service.delete(id, request.user.id)
  }

  @Post(':id/refresh-source')
  @ApiOperation({ summary: 'Get a refresh proposal from connected investment data' })
  @ApiResponse({
    status: 200,
    description: 'Returns a holdings/principal refresh proposal and category diff without mutating the plan',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  refreshSource(@Param('id') id: string, @Request() request: FastifyRequest & { user: { id: string } }) {
    return this.service.refreshSource(id, request.user.id)
  }
}
