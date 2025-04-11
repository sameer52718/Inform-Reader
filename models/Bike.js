import mongoose from 'mongoose';

const specsSchema = new mongoose.Schema({
    name: { type: String, required: false, trim: true },
    value: { type: String, required: false, trim: true }
});

const bikeSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', },
    makeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Make' },
    modelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Model' },
    year: { type: Number, required: true, },
    image: { type: String, required: false, trim: true },
    technicalSpecs: [specsSchema],  
    featureAndSafety: [specsSchema],  
    evsFeatures: [specsSchema],  
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Bike = mongoose.model('Bike', bikeSchema);

export default Bike;
