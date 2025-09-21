import mongoose from 'mongoose';

const specsSchema = new mongoose.Schema({
  name: { type: String, required: false, trim: true },
  value: { type: String, required: false, trim: true },
});

const bikeSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    makeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Make' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    name: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    slug: { type: String, required: false, unique: true, lowercase: true, trim: true },
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

bikeSchema.index({
  status: 1,
  isDeleted: 1,
  makeId: 1,
  vehicleType: 1,
  year: 1,
});

bikeSchema.index({
  status: 1,
  isDeleted: 1,
  categoryId: 1,
});

bikeSchema.index({
  name: 'text',
});

const Vehicle = mongoose.model('Bike', bikeSchema);

export default Vehicle;
