import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/theme-provider";
import type { ReactElement, ReactNode } from "react";

// Create test QueryClient
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Provider wrapper options
interface WrapperOptions {
  queryClient?: QueryClient;
  initialTheme?: "light" | "dark" | "system";
}

// Create all providers wrapper
function createWrapper(options: WrapperOptions = {}) {
  const { queryClient = createTestQueryClient(), initialTheme = "light" } =
    options;

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme={initialTheme}>{children}</ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );
  };
}

// Custom render options
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  wrapperOptions?: WrapperOptions;
}

// Custom render function
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const { wrapperOptions = {}, ...renderOptions } = options;
  const queryClient = wrapperOptions.queryClient ?? createTestQueryClient();

  const result = render(ui, {
    wrapper: createWrapper({ ...wrapperOptions, queryClient }),
    ...renderOptions,
  });

  return {
    ...result,
    queryClient,
  };
}

// Re-export testing-library
export * from "@testing-library/react";
export { customRender as render, createWrapper };
