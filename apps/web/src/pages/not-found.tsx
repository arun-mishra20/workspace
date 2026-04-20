import { BlankLayout } from '@/components/layouts'
import { FileQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'

export const NotFoundPage = () => {
  return (
    <BlankLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <FileQuestion className="mb-4 size-12 text-muted-foreground/50" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sorry, the page you are looking for does not exist.
        </p>
        <Link
          to="/"
          replace
          className="mt-6 text-sm font-medium text-primary hover:underline"
        >
          Go to Home
        </Link>
      </div>
    </BlankLayout>
  )
}
