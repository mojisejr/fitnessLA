import { betterAuth } from "better-auth";

export const auth = betterAuth({
  appName: "fitnessLA",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-secret-change-me",
  emailAndPassword: {
    enabled: true,
  },
});
