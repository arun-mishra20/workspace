import { MainLayout } from '@/components/layouts'
import { DashboardChat } from '@/features/ai-assistant/components/dashboard-chat'

const Dashboard = () => {
  return (
    <MainLayout hideAiPanel>
      <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
        <DashboardChat />
      </div>
    </MainLayout>
  )
}

export default Dashboard
