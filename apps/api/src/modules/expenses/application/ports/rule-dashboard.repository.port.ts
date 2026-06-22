import type {
  CreateRuleDashboardInput,
  RuleDashboard,
  UpdateRuleDashboardInput,
} from '@workspace/domain'

export interface RuleDashboardRepository {
  findAllByUser(userId: string): Promise<RuleDashboard[]>
  findById(params: { userId: string, id: string }): Promise<RuleDashboard | null>
  create(params: {
    userId: string
    input: CreateRuleDashboardInput
  }): Promise<RuleDashboard>
  update(params: {
    userId: string
    id: string
    input: UpdateRuleDashboardInput
  }): Promise<RuleDashboard | null>
  delete(params: { userId: string, id: string }): Promise<boolean>
}

export const RULE_DASHBOARD_REPOSITORY = Symbol('RULE_DASHBOARD_REPOSITORY')
