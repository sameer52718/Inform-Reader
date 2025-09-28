import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema(
    {
        linkId: { type: String, required: true, unique: true },
        advertiserId: { type: String, required: true, index: true },
        advertiserName: String,
        linkType: String,
        description: String,
        destination: String,
        clickUrl: String,
        promotionStartDate: String,
        promotionEndDate: String,
    },
    { timestamps: true, collection: 'links' }
);

linkSchema.index({ linkId: 1 }, { unique: true });

const Link = mongoose.models.Link || mongoose.model('Link', linkSchema);
export default Link;
