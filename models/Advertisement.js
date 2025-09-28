import mongoose from 'mongoose';

const commissionSchema = new mongoose.Schema({
    value: String,
    name: String,
    id: String,
}, { _id: false });

const actionSchema = new mongoose.Schema({
    name: String,
    type: String,
    id: String,
    commission: {
        default: String,
        itemlist: [commissionSchema],
    },
}, { _id: false });

const advertisementSchema = new mongoose.Schema(
    {
        advertiserId: { type: String, required: true, unique: true },
        advertiserName: { type: String, required: true },
        programName: String,
        programUrl: String,
        accountStatus: String,
        sevenDayEpc: String,
        threeMonthEpc: String,
        language: String,
        relationshipStatus: String,
        mobileTrackingCertified: Boolean,
        cookielessTrackingEnabled: Boolean,
        networkRank: String,
        primaryCategory: {
            parent: String,
            child: String,
        },
        performanceIncentives: Boolean,
        actions: [actionSchema],   // ✅ force object array
        linkTypes: [String],
    },
    { timestamps: true, collection: 'advertisements' }
);

advertisementSchema.index({ advertiserId: 1 }, { unique: true });

// 🔥 Fix model overwrite during hot-reload
const Advertisement = mongoose.models.Advertisement || mongoose.model('Advertisement', advertisementSchema);

export default Advertisement;
