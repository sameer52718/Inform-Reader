import mongoose from 'mongoose';

const offerRuleSchema = new mongoose.Schema({
    oid: { type: Number, required: true },
    offer_number: { type: String, required: true },
    is_base_commission: { type: Boolean, required: true },
    is_first_click: { type: Boolean, required: true },
    is_dynamic: { type: Boolean, required: true },
    commissions: [{
        commission_type: { type: String, required: true },
        description: { type: String, required: true },
        dynamic_rules: [{
            transaction_field_id: { type: Number },
            transaction_field_name: { type: String },
            operand: { type: String },
            operation: { type: String },
            category_level: { type: Number }
        }],
        tiers: [{
            commission: { type: Number, required: true },
            threshold: { type: Number, required: true },
            upper_threshold: { type: Number, default: null }
        }]
    }]
}, { _id: false });

const advertiserSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    network: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, required: true },
    existing_partnership: { type: Boolean, required: true },
    details: { type: String }
}, { _id: false });

const lastModifiedSchema = new mongoose.Schema({
    datetime: { type: Date, required: true },
    fields: [{ type: String }]
}, { _id: false });

const offerSchema = new mongoose.Schema({
    advertiser: { type: advertiserSchema, required: true },
    offer_number: { type: String, required: true },
    goid: { type: Number, required: true },
    status: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    auto_renew: { type: Boolean, required: true },
    return_days: { type: Number, required: true },
    truelock: { type: Boolean, required: true },
    update_window: { type: Number, required: true },
    start_datetime: { type: Date, required: true },
    end_datetime: { type: Date, required: true },
    last_modified: { type: lastModifiedSchema, required: true },
    join_datetime: { type: Date, required: true },
    terms_url: { type: String, required: true },
    offer_rules: [offerRuleSchema],
    metadata: {
        api_name_version: { type: String },
        page: { type: Number },
        limit: { type: Number },
        total: { type: Number },
        total_pages: { type: Number }
    },
    fetched_at: { type: Date, default: Date.now },
    is_active: { type: Boolean, default: true }
}, { timestamps: true });

// Compound index for unique offers
offerSchema.index({ goid: 1 }, { unique: true });
offerSchema.index({ 'advertiser.id': 1, status: 1 });
offerSchema.index({ start_datetime: 1, end_datetime: 1 });
offerSchema.index({ fetched_at: -1 });

export default mongoose.model('Offer', offerSchema);