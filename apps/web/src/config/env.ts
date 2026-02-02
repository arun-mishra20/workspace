import { z } from "zod";

const envSchema = z.object({
  // Backend URL (Vite proxy handles /api requests)
  VITE_API_BASE_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  MODE: z.string().optional(),
});

export const env = envSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  NODE_ENV: import.meta.env.NODE_ENV || import.meta.env.MODE,
  MODE: import.meta.env.MODE,
});
