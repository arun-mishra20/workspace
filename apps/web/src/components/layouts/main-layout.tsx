import { BlankLayout } from "@/components/layouts";
import { Nav } from "@/components/nav/nav";
import { ReactNode } from "react";

export interface MainLayoutProps {
  children?: ReactNode;
  bordered?: boolean;
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
export const MainLayout = ({ children, bordered = true }: MainLayoutProps) => {
  return (
    <BlankLayout bordered={bordered}>
      <Nav />
      {children}
    </BlankLayout>
  );
};
