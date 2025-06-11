import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    logo: {
      type: String,
      required: true,
    },
    themeColor: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

const Config = mongoose.model('Config', settingsSchema);

export default Config;
