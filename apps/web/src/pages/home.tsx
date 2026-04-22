import { BlankLayout } from '@/components/layouts'
import { Nav } from '@/components/nav/nav'
import { Hero } from '@/features/home/components/hero'

export const HomePage = () => {
  return (
    <BlankLayout>
      <Nav />
      <Hero />
    </BlankLayout>
  )
}
