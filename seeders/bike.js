import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Bike from '../models/Bike.js';
import Make from '../models/Make.js';
import Model from '../models/Model.js';
import User from '../models/User.js';

dotenv.config();

const seedBikes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🚀 Connected to MongoDB');

    // Dummy specs
    const dummySpecs = [
      { name: 'Engine Type', value: 'Liquid-cooled, 4-stroke' },
      { name: 'Displacement', value: '155 cc' },
      { name: 'Fuel System', value: 'Fuel Injection' },
    ];

    const dummyFeatures = [
      { name: 'ABS', value: 'Yes' },
      { name: 'Traction Control', value: 'No' },
    ];

    const dummyEvsFeatures = [
      { name: 'Battery Capacity', value: '3.2 kWh' },
      { name: 'Charging Time', value: '4 hours' },
    ];

    const bikesData = [
      { make: 'Toyota', model: 'Corolla', year: 2024, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Honda', model: 'CBR500R', year: 2023, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Yamaha', model: 'R15', year: 2022, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Suzuki', model: 'Gixxer SF', year: 2021, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Kawasaki', model: 'Ninja 300', year: 2023, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'BMW', model: 'G 310 R', year: 2024, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Ducati', model: 'Monster', year: 2022, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'KTM', model: 'RC 390', year: 2023, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Royal Enfield', model: 'Classic 350', year: 2021, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Hero', model: 'Xtreme 160R', year: 2022, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'TVS', model: 'Apache RR 310', year: 2020, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Bajaj', model: 'Dominar 400', year: 2021, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Triumph', model: 'Trident 660', year: 2023, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Harley-Davidson', model: 'Iron 883', year: 2020, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Aprilia', model: 'RS 660', year: 2022, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Benelli', model: 'Imperiale 400', year: 2023, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Honda', model: 'CB500X', year: 2024, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Yamaha', model: 'MT-15', year: 2023, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'Suzuki', model: 'Burgman Street', year: 2022, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      { make: 'BMW', model: 'S 1000 RR', year: 2023, image: 'https://i.pinimg.com/736x/27/f8/3a/27f83a1a4952e167b728d00e2a3f0e30.jpg' },
      // ... (Add more below to reach 100+ total)
    ];

    // Preload all makes and models
    const allMakes = await Make.find();
    const allModels = await Model.find();

    // Create maps for quick lookup
    const makeMap = new Map(allMakes.map(m => [m.name, m]));
    const modelMap = new Map(allModels.map(m => [`${m.name}_${m.makeId.toString()}`, m]));

    for (const bike of bikesData) {
      // Check make
      let make = makeMap.get(bike.make);
      if (!make) {
        make = await Make.create({ name: bike.make });
        makeMap.set(bike.make, make); // Add to cache
        console.log(`📌 Created new make: ${bike.make}`);
      }

      const modelKey = `${bike.model}_${make._id.toString()}`;
      let model = modelMap.get(modelKey);
      if (!model) {
        model = await Model.create({ name: bike.model, makeId: make._id });
        modelMap.set(modelKey, model); // Add to cache
        console.log(`📌 Created new model: ${bike.model}`);
      }

      await Bike.create({
        adminId: null,
        makeId: make._id,
        modelId: model._id,
        year: bike.year,
        technicalSpecs: dummySpecs,
        featureAndSafety: dummyFeatures,
        evsFeatures: dummyEvsFeatures,
      });

      console.log(`✅ Inserted bike: ${bike.make} ${bike.model} (${bike.year})`);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding bikes:', error.message);
    process.exit(1);
  }
};

seedBikes();
