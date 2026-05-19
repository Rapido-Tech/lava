import mongoose from "mongoose"

const membershipPlanSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ["monthly", "passes"],
      required: true,
    },
    passCount: { type: Number }, // only for type: passes
    price: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const MembershipPlan = mongoose.model("MembershipPlan", membershipPlanSchema)
