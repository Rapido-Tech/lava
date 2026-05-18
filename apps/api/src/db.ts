import mongoose from "mongoose"
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI!

export const mongoClient = new MongoClient(uri)
export const mongoDb = mongoClient.db("lava")

export async function connectDB() {
  if (!uri) throw new Error("MONGODB_URI is not set")
  await mongoClient.connect()
  await mongoose.connect(uri, { dbName: "lava" })
  console.log("Connected to MongoDB")
}
