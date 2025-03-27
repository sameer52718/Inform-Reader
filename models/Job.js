import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    location: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    qualification: { type: String, required: true },
    description: { type: String, required: false },
    experience: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Any'], required: true },
    careerLevel: { type: String, required: true },
    type: { type: String, enum: ['Full-Time', 'Part-Time', 'Contract', 'Internship'], required: true },
    logo: { type: String, required: false },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Job = mongoose.model('Job', jobSchema);

export default Job;
