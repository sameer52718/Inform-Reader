import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
    {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
        subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: false },
        promotiontypes: {
            promotiontype: { type: String, required: false },
        },
        offerdescription: { type: String, required: false },
        offerstartdate: { type: Date, required: false },
        offerenddate: { type: Date, required: false },
        couponcode: { type: String, required: false },
        clickurl: { type: String, required: false },
        impressionpixel: { type: String, required: false },
        advertiserid: { type: Number, required: false },
        advertisername: { type: String, required: false },
        network: { type: String, required: false },
        status: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
