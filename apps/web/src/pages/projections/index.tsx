import { MainLayout } from '@/components/layouts'
import { ProjectionCalculatorPage } from '@/features/investment-projection/components/projection-calculator-page'

export default function ProjectionsPage() {
  return (
    <MainLayout>
      <ProjectionCalculatorPage />
    </MainLayout>
  )
}
