import mongoose from "mongoose"

const shiftSchema = new mongoose.Schema(
  {
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
    clockIn:    { type: Date, required: true, default: Date.now },
    clockOut:   { type: Date },
    durationMins: { type: Number }, // set on clockOut
    notes:      { type: String, trim: true },
    status:     { type: String, enum: ["open", "closed"], default: "open", index: true },
  },
  { timestamps: true }
)

export const Shift = mongoose.model("Shift", shiftSchema)
