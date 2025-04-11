// Updated seeder to insert nested make-model-variant structure
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vehicle from '../models/Vihicle.js';
import Make from '../models/Make.js';
import Model from '../models/Model.js';
import Category from '../models/Category.js';
import Type from '../models/Type.js';

dotenv.config();

const seedVehiclesFromStructuredData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🚀 Connected to MongoDB');

    const vehicleData = [
      {
        "makeName": "Toyota",
        "makeImage": "https://example.com/toyota-logo.png",
        "models": [
          {
            "modelName": "Corolla",
            "modelImage": "https://example.com/corolla.png",
            "variants": [
              {
                "category": "Car",
                "year": 2024,
                "image": "https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg",
                "evsFeatures": [
                  { "name": "Battery Capacity", "value": "3.2 kWh" },
                  { "name": "Charging Time", "value": "4 hours" }
                ],
                "featureAndSafety": [
                  { "name": "ABS", "value": "Yes" },
                  { "name": "Traction Control", "value": "No" }
                ],
                "technicalSpecs": [
                  { "name": "Engine Type", "value": "Inline-4" },
                  { "name": "Displacement", "value": "1798 cc" },
                  { "name": "Fuel System", "value": "Fuel Injection" }
                ]
              }
            ]
          },
          {
            "modelName": "Camry",
            "modelImage": "https://example.com/camry.png",
            "variants": [
              {
                "category": "Car",
                "year": 2023,
                "image": "https://example.com/camry-2023.png",
                "evsFeatures": [
                  { "name": "Battery Capacity", "value": "5.0 kWh" },
                  { "name": "Charging Time", "value": "6 hours" }
                ],
                "featureAndSafety": [
                  { "name": "Lane Assist", "value": "Yes" },
                  { "name": "Blind Spot Monitor", "value": "Yes" }
                ],
                "technicalSpecs": [
                  { "name": "Engine Type", "value": "Hybrid Inline-4" },
                  { "name": "Displacement", "value": "2487 cc" },
                  { "name": "Fuel System", "value": "Hybrid Synergy Drive" }
                ]
              }
            ]
          }
        ]
      },
      {
        "makeName": "Honda",
        "makeImage": "https://example.com/honda-logo.png",
        "models": [
          {
            "modelName": "CBR500R",
            "modelImage": "https://example.com/cbr500r.png",
            "variants": [
              {
                "category": "Bike",
                "year": 2023,
                "image": "https://example.com/cbr500r-2023.png",
                "evsFeatures": [],
                "featureAndSafety": [
                  { "name": "ABS", "value": "Yes" },
                  { "name": "Traction Control", "value": "Yes" }
                ],
                "technicalSpecs": [
                  { "name": "Engine Type", "value": "Parallel Twin" },
                  { "name": "Displacement", "value": "471 cc" },
                  { "name": "Fuel System", "value": "PGM-FI" }
                ]
              }
            ]
          },
          {
            "modelName": "CB500X",
            "modelImage": "https://example.com/cb500x.png",
            "variants": [
              {
                "category": "Bike",
                "year": 2024,
                "image": "https://example.com/cb500x-2024.png",
                "evsFeatures": [],
                "featureAndSafety": [
                  { "name": "ABS", "value": "Yes" },
                  { "name": "Slipper Clutch", "value": "Yes" }
                ],
                "technicalSpecs": [
                  { "name": "Engine Type", "value": "Parallel Twin" },
                  { "name": "Displacement", "value": "471 cc" },
                  { "name": "Fuel System", "value": "PGM-FI" }
                ]
              }
            ]
          }
        ]
      },
      {
        "makeName": "Tesla",
        "makeImage": "https://example.com/tesla-logo.png",
        "models": [
          {
            "modelName": "Model 3",
            "modelImage": "https://example.com/tesla-model3.png",
            "variants": [
              {
                "category": "Car",
                "year": 2024,
                "image": "https://example.com/tesla-model3-2024.png",
                "evsFeatures": [
                  { "name": "Battery Capacity", "value": "57.5 kWh" },
                  { "name": "Charging Time", "value": "8.5 hours (Home)" }
                ],
                "featureAndSafety": [
                  { "name": "Autopilot", "value": "Yes" },
                  { "name": "Collision Avoidance", "value": "Yes" }
                ],
                "technicalSpecs": [
                  { "name": "Motor Type", "value": "Dual Motor" },
                  { "name": "Range", "value": "272 miles" },
                  { "name": "Top Speed", "value": "140 mph" }
                ]
              }
            ]
          }
        ]
      }
    ];


    const allCategories = await Category.find();
    const allTypes = await Type.find();

    const categoryMap = new Map(allCategories.map(c => [c.name.trim(), c]));
    const typeMap = new Map(allTypes.map(t => [t.name.trim(), t]));

    for (const makeItem of vehicleData) {
      let make = await Make.findOne({ name: makeItem.makeName });
      if (!make) {
        make = await Make.create({ name: makeItem.makeName, image: makeItem.makeImage });
        console.log(`✅ Created make: ${make.name}`);
      }

      for (const modelItem of makeItem.models) {
        let model = await Model.findOne({ name: modelItem.modelName, makeId: make._id });
        if (!model) {
          model = await Model.create({
            name: modelItem.modelName,
            makeId: make._id,
            image: modelItem.modelImage,
          });
          console.log(`✅ Created model: ${model.name}`);
        }

        for (const variant of modelItem.variants) {
          let category = categoryMap.get(variant.category);
          if (!category) {
            let typeName = ['Bike', 'Car'].includes(variant.category) ? variant.category : 'Other';
            let type = typeMap.get(typeName);
            if (!type) {
              type = await Type.create({ name: typeName, slug: typeName });
              typeMap.set(typeName, type);
              console.log(`📌 Created new type: ${typeName}`);
            }

            category = await Category.create({ name: variant.category, type: type._id });
            categoryMap.set(variant.category, category);
            console.log(`📌 Created new category: ${variant.category}`);
          }

          await Vehicle.create({
            adminId: null,
            makeId: make._id,
            modelId: model._id,
            year: variant.year,
            categoryId: category._id,
            technicalSpecs: variant.technicalSpecs || [],
            featureAndSafety: variant.featureAndSafety || [],
            evsFeatures: variant.evsFeatures || [],
            image: variant.image,
          });

          console.log(`🚲 Inserted vehicle: ${make.name} ${model.name} (${variant.year})`);
        }
      }
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding vehicles:', error.message);
    process.exit(1);
  }
};

seedVehiclesFromStructuredData();