import mongoose from "mongoose"

const inventoryLogSchema = new mongoose.Schema(
  {
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    itemId:     { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type:       { type: String, enum: ["restock", "use"], required: true },
    quantity:   { type: Number, required: true },
    note:       { type: String, trim: true },
  },
  { timestamps: true }
)

export const InventoryLog = mongoose.model("InventoryLog", inventoryLogSchema)
