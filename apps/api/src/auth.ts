import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { mongoDb } from "./db"

export const auth = betterAuth({
  database: mongodbAdapter(mongoDb),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["http://localhost:5173"],
})
