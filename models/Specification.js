import mongoose from 'mongoose';

// Schema for General Specifications (e.g., microphone, network camera)
const generalSchema = new mongoose.Schema({
    name: { type: String, required: false, trim: true },
    value: { type: String, required: false, trim: true }
});

// Schema for Data (with a general section and more)
const dataSchema = new mongoose.Schema({
    generalSpecs: [generalSchema],        
    general: [generalSchema],        
    compatibility: [generalSchema],   
    connectors: [generalSchema],     
    dimensions: [generalSchema],      
    memory: [generalSchema],      
    miscellaneous: [generalSchema],  
    links: [generalSchema],
    display: [generalSchema],
    processor: [generalSchema],
    storage: [generalSchema],
    camera: [generalSchema],
    communication: [generalSchema],
    features: [generalSchema],
    design: [generalSchema],
    powerSupply: [generalSchema],
    audioFeatures: [generalSchema],
},{ _id: false });

// Schema for Specification (used for different product categories)
const specificationSchema = new mongoose.Schema(
    {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: false },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
        subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: false },
        name: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        price: { type: Number, required: true, trim: true },
        priceSymbal: { type: String, default: 'PKR' },
        image: { type: String, required: false, trim: true },
        data: dataSchema,
        status: { type: Boolean, default: true},
        isDeleted: { type: Boolean, default: false},
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Model for Specification
const Specification = mongoose.model('Specification', specificationSchema);

export default Specification;
