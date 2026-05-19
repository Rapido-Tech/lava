import mongoose from "mongoose"

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    loyaltyAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "LoyaltyAccount", required: true, index: true },
    customerId:       { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    locationId:       { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    type:             { type: String, enum: ["earn", "redeem"], required: true },
    points:           { type: Number, required: true },
    note:             { type: String, trim: true },
    queueEntryId:     { type: mongoose.Schema.Types.ObjectId, ref: "QueueEntry" },
  },
  { timestamps: true }
)

export const LoyaltyTransaction = mongoose.model("LoyaltyTransaction", loyaltyTransactionSchema)
