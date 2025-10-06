import mongoose from "mongoose";

const CouponFeedSchema = new mongoose.Schema(
  {
    categories: {
      category: { type: String, required: false },
    },
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
  },
  {
    timestamps: true, // automatically adds createdAt & updatedAt
  }
);

export default mongoose.model("CouponFeed", CouponFeedSchema);
