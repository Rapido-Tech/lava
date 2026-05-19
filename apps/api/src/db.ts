import mongoose from "mongoose"

export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error("MONGODB_URI is not set")

  await mongoose.connect(uri, {
    dbName: "lava",
    family: 4,                      // force IPv4 — fixes SRV resolution on Windows/Bun
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
  })

  console.log("Connected to MongoDB")
}
