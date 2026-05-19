import mongoose from "mongoose"

const inventoryItemSchema = new mongoose.Schema(
  {
    locationId:         { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    name:               { type: String, required: true, trim: true },
    unit:               { type: String, required: true, trim: true }, // "litres", "kg", "pcs", "bottles"
    category:           { type: String, trim: true, default: "General" },
    currentStock:       { type: Number, required: true, default: 0 },
    lowStockThreshold:  { type: Number, required: true, default: 0 },
    active:             { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema)
