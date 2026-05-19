import mongoose from "mongoose"

const customerSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    vehiclePlates: [{ type: String, trim: true, uppercase: true }],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

customerSchema.index({ locationId: 1, name: 1 })

export const Customer = mongoose.model("Customer", customerSchema)
