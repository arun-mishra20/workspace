import { ProtectedNavigationShell } from '@/components/nav/navigation-shells'
import { AiAssistantPanel } from '@/features/ai-assistant/components/ai-assistant-panel'
import { ReactNode } from 'react'

export interface MainLayoutProps {
  children?: ReactNode
  hideAiPanel?: boolean
}

/**
 * Main layout component with navbar
 * Wraps all main pages with BlankLayout and Nav
 *
 * @example
 * export const HomePage = () => {
 *   return (
 *     <MainLayout>
 *       <Hero />
 *     </MainLayout>
 *   );
 * };
 */
export const MainLayout = ({
  children,
  hideAiPanel = false,
}: MainLayoutProps) => {
  return (
    <>
      <ProtectedNavigationShell>{children}</ProtectedNavigationShell>
      {!hideAiPanel && <AiAssistantPanel />}
    </>
  )
}
