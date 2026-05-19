import mongoose from "mongoose"

const customerMembershipSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date },        // set for monthly plans
    passesTotal: { type: Number },  // set for pass plans
    passesUsed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "expired", "depleted"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
)

export const CustomerMembership = mongoose.model("CustomerMembership", customerMembershipSchema)
