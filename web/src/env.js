import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

const getServerSchema = () => ({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: isProd ? z.string().url() : z.string().url().optional(),
  DATABASE_TOKEN: isProd ? z.string() : z.string().optional(),
  BETTER_AUTH_SECRET: isProd ? z.string() : z.string().optional(),
  RESEND_API_KEY: isProd ? z.string() : z.string().optional(),
  RESEND_FROM_EMAIL: isProd ? z.string().email() : z.string().email().optional(),
  BETTER_AUTH_URL: isProd ? z.string().url() : z.string().url().optional(),
});

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: getServerSchema(),

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_TOKEN: process.env.DATABASE_TOKEN,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

if (typeof window === 'undefined' && !process.env.__ENV_LOGGED__) {
  process.env.__ENV_LOGGED__ = "1";
  const color = env.NODE_ENV === 'production' ? '\x1b[31m' : '\x1b[32m';
  // eslint-disable-next-line no-console
  console.log(`${color}🔧 Environment: ${env.NODE_ENV}\x1b[0m`);
}

