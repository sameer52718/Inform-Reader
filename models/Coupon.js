import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
    {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
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
        impressionpixel: { type: String, required: false }, // Stores image link from link-code-html
        advertiserid: { type: Number, required: false },
        advertisername: { type: String, required: false },
        status: { type: Boolean, default: true, required: false },
        refrence: { type: String, enum: ['RU', 'CJ'], default: 'RU', required: false },
        isDeleted: { type: Boolean, default: false, required: false },
        clickCommission: { type: Number, required: false },
        creativeHeight: { type: Number, required: false },
        creativeWidth: { type: Number, required: false },
        language: { type: String, required: false },
        linkCodeHtml: { type: String, required: false },
        linkCodeJavascript: { type: String, required: false },
        destination: { type: String, required: false },
        linkId: { type: Number, required: false },
        linkName: { type: String, required: false },
        linkType: { type: String, required: false },
        allowDeepLinking: { type: Boolean, required: false },
        performanceIncentive: { type: Boolean, required: false },
        saleCommission: { type: String, required: false },
        mobileOptimized: { type: Boolean, required: false },
        mobileAppDownload: { type: Boolean, required: false },
        crossDeviceOnly: { type: Boolean, required: false },
        targetedCountries: { type: String, required: false },
        eventName: { type: String, required: false },
        adContent: { type: String, required: false },
        lastUpdated: { type: Date, required: false },
        sevenDayEpc: { type: String, required: false },
        threeMonthEpc: { type: String, required: false },
    },
    { timestamps: true }
);

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;