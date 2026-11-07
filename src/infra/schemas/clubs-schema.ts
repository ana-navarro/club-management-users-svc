import mongoose, { Schema } from 'mongoose'

const clubsSchema = new Schema(
  { name: { type: String, required: true } },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const ClubModel = mongoose.model('Club', clubsSchema, 'clubs')
