import mongoose from 'mongoose';

// Define a sub-schema for the details in different categories
const generalSchema = new mongoose.Schema({
  label: String,
  value: String
});

const displaySchema = new mongoose.Schema({
  label: String,
  value: String
});

const hardwareSchema = new mongoose.Schema({
  label: String,
  value: String
});

const cameraSchema = new mongoose.Schema({
  label: String,
  value: String
});

const softwareSchema = new mongoose.Schema({
  label: String,
  value: String
});

const connectivitySchema = new mongoose.Schema({
  label: String,
  value: String
});

const sensorsSchema = new mongoose.Schema({
  label: String,
  value: String
});

// Define the main Phone schema
const mobileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  price: { type: String, required: true },
  image: { type: String, required: true },
  general: [generalSchema], // Array of general information
  display: [displaySchema], // Array of display-related information
  hardware: [hardwareSchema], // Array of hardware-related information
  camera: [cameraSchema], // Array of camera-related information
  software: [softwareSchema], // Software-related information
  connectivity: [connectivitySchema], // Connectivity-related information
  sensors: [sensorsSchema] // Sensors-related information
}, { timestamps: true });

const Mobile = mongoose.model('Mobile', mobileSchema);

export default Mobile;
