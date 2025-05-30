import mongoose from 'mongoose';

const specsSchema = new mongoose.Schema({
  name: { type: String, required: false, trim: true },
  value: { type: String, required: false, trim: true },
});

const vehicleSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    makeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Make' },
    modelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Model' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    name: { type: String, required: true, trim: true }, // Added for search functionality
    year: { type: Number, required: true },
    vehicleType: {
      type: String,
      enum: ['ELECTRIC', 'PETROL', 'HYBRID', 'DIESEL', 'OTHER'],
      required: true,
      default: 'OTHER',
    },
    image: { type: String, required: false, trim: true },
    technicalSpecs: [specsSchema],
    featureAndSafety: [specsSchema],
    evsFeatures: [specsSchema],
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
