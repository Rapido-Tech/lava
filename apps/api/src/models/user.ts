import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "manager", "cashier"],
      default: "owner",
    },
    jobTitle: { type: String, trim: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    locationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Location" }],
  },
  { timestamps: true }
)

export const User = mongoose.model("User", userSchema)
