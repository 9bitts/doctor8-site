import { z } from "zod";

const productionEnvSchema = z.object({
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "ENCRYPTION_KEY must be a 32-byte hex string"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

/**
 * Validates critical secrets at server boot in production.
 * Skipped in development/test so local `.env` can be partial.
 */
export function validateServerEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const result = productionEnvSchema.safeParse(process.env);
  if (result.success) return;

  const fields = Object.keys(result.error.flatten().fieldErrors);
  throw new Error(
    `Invalid production environment: ${fields.join(", ")}. Check AUTH_SECRET, ENCRYPTION_KEY, and DATABASE_URL.`,
  );
}
