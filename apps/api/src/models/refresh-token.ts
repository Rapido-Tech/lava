import mongoose from "mongoose"

const refreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

// MongoDB TTL index — auto-deletes expired tokens from the collection
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema)
