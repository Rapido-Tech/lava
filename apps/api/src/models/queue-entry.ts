import mongoose from "mongoose"

const queueSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    vehiclePlate: { type: String, required: true, trim: true, uppercase: true },
    vehicleDescription: { type: String, trim: true },
    customerName: { type: String, trim: true },
    bayNumber: { type: Number },
    status: {
      type: String,
      enum: ["waiting", "in_progress", "ready", "completed"],
      default: "waiting",
      index: true,
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    membershipActive: { type: Boolean, default: false },
    payment: {
      amount:    { type: Number },
      method:    { type: String, enum: ["cash", "mpesa", "card"] },
      reference: { type: String, trim: true },
    },
    notes: { type: String, trim: true },
    checkedInAt: { type: Date, default: Date.now },
    startedAt:   { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
)

export const QueueEntry = mongoose.model("QueueEntry", queueSchema)
