import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
    {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: false },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
        subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: false },
        name: { type: String, required: true, unique: true },
        discount: { type: Number, required: true },
        code: { type: String, required: true },
        image: { type: String, required: false, trim: true },
        status: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
