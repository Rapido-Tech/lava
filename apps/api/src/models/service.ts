import mongoose from "mongoose"

const serviceSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    durationMins: { type: Number, required: true, min: 1 },
    category: { type: String, default: "General", trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Service = mongoose.model("Service", serviceSchema)
