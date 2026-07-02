import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";

export const auth = betterAuth({
    database: new Pool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    }),
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL!,
    trustedOrigins: ['http://localhost:3000'], 
    emailAndPassword: { enabled: true },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        },
        apple: {
            clientId: process.env.APPLE_CLIENT_ID!,
            clientSecret: process.env.APPLE_CLIENT_SECRET!,
        },
        microsoft: {
            clientId: process.env.MICROSOFT_CLIENT_ID!,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        },
    },
    user: {
        additionalFields: {
            isAdmin: { type: "boolean", defaultValue: false, input: false },
            contact: { type: "string", required: false },
        },
    },
    account: { accountLinking: { enabled: true, trustedProviders: ["google", "github", "discord", "apple", "microsoft", "email-password"] } },
});