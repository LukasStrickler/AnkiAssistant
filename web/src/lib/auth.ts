import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/db";
import { env } from "@/env";
import { magicLink } from "better-auth/plugins";
import { magicLinkClient } from "better-auth/client/plugins";
import { logger } from "@/lib/logger";
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
    }),
    plugins: [
        magicLink({
            expiresIn: 60 * 60 * 30,
            sendMagicLink: async ({ email, token: _token, url }) => {
                logger.info("Magic link generated:", { email, url });
            }
        })
    ]
});


import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient({
    baseURL: env.BETTER_AUTH_URL,
    plugins: [
        magicLinkClient()
    ]
})
export const { signIn, signUp, useSession } = createAuthClient()

// https://www.better-auth.com/docs/plugins/magic-link
// const { data, error } = await authClient.signIn.magicLink({
//     email: "user@email.com",
//     callbackURL: "/dashboard" //redirect after successful login (optional)
// });