import mongoose from 'mongoose';
import Nationality from './Nationality.js';

const generalInformationSchema = new mongoose.Schema({
    name: { type: String, required: false, trim: true },
    value: { type: String, required: false, trim: true }
});

const biohraphySchema = new mongoose.Schema(
    {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        nationalityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nationality', required: false },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
        name: { type: String, required: true, },
        description: { type: String, required: false },
        religion: { type: String, required: false },
        image: { type: String, required: false },
        generalInformation: [generalInformationSchema],
        status: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Biography = mongoose.model('Biography', biohraphySchema);

export default Biography;
