import mongoose from "mongoose";

const merchantSchema = new mongoose.Schema({
    advertiserId: { type: Number, required: true, unique: true },
    name: String,
    url: String,
    description: String,
    can_partner: Boolean,
    contact: {
        name: String,
        job_title: String,
        email: String,
        phone: String,
        country: String,
    },
    policies: mongoose.Schema.Types.Mixed,
    features: mongoose.Schema.Types.Mixed,
    network: mongoose.Schema.Types.Mixed,
    refrence: { type: String, enum: ['RU', 'CJ'], default: 'RU', required: false },
}, { timestamps: true });

export default mongoose.model("Merchant", merchantSchema);
