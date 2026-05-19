import mongoose from "mongoose"

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    plan: {
      type: String,
      enum: ["starter", "pro", "enterprise"],
      default: "starter",
    },
    stripeCustomerId: { type: String },
  },
  { timestamps: true }
)

export const Account = mongoose.model("Account", accountSchema)
