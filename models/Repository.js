import mongoose from "mongoose"

const repositorySchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    index: true,
  },
  owner: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  processedData: {
    type: Object,
    required: true,
  },
  lastProcessed: {
    type: Date,
    default: Date.now,
  },
  processingStatus: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
  },
  errorMessage: {
    type: String,
    default: null,
  },
})

// Compound index for owner and name
repositorySchema.index({ owner: 1, name: 1 }, { unique: true })

const Repository = mongoose.model("Repository", repositorySchema)

export default Repository
