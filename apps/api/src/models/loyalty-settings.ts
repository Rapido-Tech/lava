import mongoose from "mongoose"

const loyaltySettingsSchema = new mongoose.Schema(
  {
    locationId:     { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, unique: true },
    enabled:        { type: Boolean, default: true },
    pointsPerWash:  { type: Number, default: 10 },
    kshPerPoint:    { type: Number, default: 1 }, // 1 point = KSh 1 on redemption
  },
  { timestamps: true }
)

export const LoyaltySettings = mongoose.model("LoyaltySettings", loyaltySettingsSchema)
