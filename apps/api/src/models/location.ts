import mongoose from "mongoose"

const locationSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    timezone: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Location = mongoose.model("Location", locationSchema)
