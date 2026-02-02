import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400 md:flex-row md:justify-between md:text-left">
        <p>
          &copy;
          {currentYear} Your Company. All rights reserved.
        </p>

        <div className="flex gap-4">
          <Link
            to="/privacy"
            className="text-foreground/80 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <Link
            to="/terms"
            className="text-foreground/80 hover:text-foreground"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
