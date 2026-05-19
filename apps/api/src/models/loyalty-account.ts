import mongoose from "mongoose"

const loyaltyAccountSchema = new mongoose.Schema(
  {
    customerId:     { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    locationId:     { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    points:         { type: Number, default: 0 },
    totalEarned:    { type: Number, default: 0 },
    totalRedeemed:  { type: Number, default: 0 },
  },
  { timestamps: true }
)

loyaltyAccountSchema.index({ customerId: 1, locationId: 1 }, { unique: true })

export const LoyaltyAccount = mongoose.model("LoyaltyAccount", loyaltyAccountSchema)
