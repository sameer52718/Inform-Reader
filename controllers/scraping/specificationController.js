import BaseController from '../BaseController.js';
import Specification from '../../models/Specification.js';

class SpecificationController extends BaseController {
  constructor() {
    super();
    this.webCamera = this.webCamera.bind(this);
    this.waterDispenser = this.waterDispenser.bind(this);
    this.washingMachine = this.washingMachine.bind(this);
    this.vaccumCleaner = this.vaccumCleaner.bind(this);
    this.tripod = this.tripod.bind(this);
    this.toners = this.toners.bind(this);
    this.tablet = this.tablet.bind(this);
    this.tabletOtherAccessories = this.tabletOtherAccessories.bind(this);
    this.universal = this.universal.bind(this);
    
    
  }

  async webCamera(req, res, next) {
    try {

      const body = req.body;

      for (const brandData of body) {

        const { brand: currentBrand, web_cameras } = brandData;

        // Validate if web_cameras data is provided for each brand
        if (!Array.isArray(web_cameras) || web_cameras.length === 0) {
          return this.handleError(next, `Web camera data is required for brand ${currentBrand}`, 400);
        }

        // Iterate over each web camera data for the current brand
        for (const camera of web_cameras) {
          const { country, data } = camera;

          // Validate if camera data contains necessary fields
          if (!data || !data.name || !data.price || !data.image) {
            return this.handleError(next, 'Web camera data must include name, price, and image', 400);
          }

          // Convert price (remove commas and currency symbols, then parse as number)
          let priceInNumber = 0;
          if (data.price && data.price !== 'N/A') {
            priceInNumber = parseFloat(data.price.replace(/[^\d.-]/g, ''));
          }

          if (isNaN(priceInNumber) && data.price !== 'N/A') {
            return this.handleError(next, 'Price format is incorrect', 400);
          }

          // Prepare the specification data structure
          const specificationData = {
            brand: currentBrand, // The current brand (e.g., Logitech)
            name: data.name, // Product name (e.g., Logitech Conference Cam Live - AP)
            price: priceInNumber, // Numeric price or 0 if 'N/A'
            image: data.image, // Image URL
            category: 'WEB_CAMERA', // Category of the product
            data: {
              // General Specs (optional field)
              general: (data.general ?? []).map(([name, value]) => ({ name, value })),
              // Compatibility (optional field, if provided)
              compatibility: (data.compatibility ?? []).map(([name, value]) => ({ name, value })),
              // Connectors (optional field, if provided)
              connectors: (data.connectors ?? []).map(([name, value]) => ({ name, value })),
              // Dimensions (optional field, if provided)
              dimensions: (data.dimensions ?? []).map(([name, value]) => ({ name, value })),
              // Memory (optional field, if provided)
              memory: (data.memory ?? []).map(([name, value]) => ({ name, value })),
              // Miscellaneous (optional field, if provided)
              miscellaneous: (data.miscellaneous ?? []).map(([name, value]) => ({ name, value })),
              // Links (optional field, if provided)
              links: (data.links ?? []).map(([name, value]) => ({ name, value }))
            }
          };

          // Create a new Specification document for the current web camera data and brand
          const newSpecification = new Specification(specificationData);

          // Save the new specification data to the database
          await newSpecification.save();
        }
      }

      // Return success response after processing all web cameras
      res.status(201).json({
        success: true,
        message: 'Data added successfully',
      });

    } catch (error) {
      // Handle errors
      return this.handleError(next, error.message);
    }
  }

  async waterDispenser(req, res, next) {
    try {
      // Get data from the request body
      const body = req.body;

      // Iterate over each brand data
      for (const brandData of body) {

        const { brand: currentBrand, water_dispenser } = brandData;

        // Validate if water_dispenser data is provided for each brand
        if (!Array.isArray(water_dispenser) || water_dispenser.length === 0) {
          return this.handleError(next, `Water dispenser data is required for brand ${currentBrand}`, 400);
        }

        // Iterate over each water dispenser data for the current brand
        for (const dispenser of water_dispenser) {
          const { country, data } = dispenser;

          // Validate if data contains necessary fields
          if (!data || !data.name || !data.price || !data.image) {
            return this.handleError(next, 'Dispenser data must include name, price, and image', 400);
          }

          // Convert price (remove commas and currency symbols, then parse as number)
          let priceInNumber = 0;
          if (data.price && data.price !== 'N/A') {
            priceInNumber = parseFloat(data.price.replace(/[^\d.-]/g, ''));
          }

          if (isNaN(priceInNumber) && data.price !== 'N/A') {
            return this.handleError(next, 'Price format is incorrect', 400);
          }

          // Prepare the specification data structure
          const specificationData = {
            brand: currentBrand, // The current brand (e.g., Dawlance)
            name: data.name, // Product name
            price: priceInNumber, // Numeric price or 0 if 'N/A'
            image: data.image, // Image URL
            category: 'WATER_DISPENSER', // Category of the product
            data: {
              // General Specs (optional field)
              general: (data.general ?? []).map(([name, value]) => ({ name, value })),
              // Compatibility (optional field, if provided)
              compatibility: (data.compatibility ?? []).map(([name, value]) => ({ name, value })),
              // Connectors (optional field, if provided)
              connectors: (data.connectors ?? []).map(([name, value]) => ({ name, value })),
              // Dimensions (optional field, if provided)
              dimensions: (data.dimensions ?? []).map(([name, value]) => ({ name, value })),
              // Memory (optional field, if provided)
              memory: (data.memory ?? []).map(([name, value]) => ({ name, value })),
              // Miscellaneous (optional field, if provided)
              miscellaneous: (data.miscellaneous ?? []).map(([name, value]) => ({ name, value })),
              // Links (optional field, if provided)
              links: (data.links ?? []).map(([name, value]) => ({ name, value }))
            }
          };

          // Create a new Specification document for the current water dispenser data and brand
          const newSpecification = new Specification(specificationData);

          // Save the new specification data to the database
          await newSpecification.save();
        }
      }

      // Return success response after processing all water dispensers
      res.status(201).json({
        success: true,
        message: 'Data added successfully',
      });

    } catch (error) {
      // Handle errors
      return this.handleError(next, error.message);
    }
  }

  async washingMachine(req, res, next) {
    try {
      // Get data from the request body
      const body = req.body;

      // Iterate over each brand data
      for (const brandData of body) {

        const { brand: currentBrand, washing_machines } = brandData;

        // Validate if washing_machines data is provided for each brand
        if (!Array.isArray(washing_machines) || washing_machines.length === 0) {
          return this.handleError(next, `Washing machine data is required for brand ${currentBrand}`, 400);
        }

        // Iterate over each washing machine data for the current brand
        for (const machine of washing_machines) {
          const { country, data } = machine;

          // Validate if data contains necessary fields
          if (!data || !data.name || !data.price || !data.image) {
            return this.handleError(next, 'Washing machine data must include name, price, and image', 400);
          }

          // Convert price (remove commas and currency symbols, then parse as number)
          let priceInNumber = 0;
          if (data.price && data.price !== 'N/A') {
            priceInNumber = parseFloat(data.price.replace(/[^\d.-]/g, ''));
          }

          if (isNaN(priceInNumber) && data.price !== 'N/A') {
            return this.handleError(next, 'Price format is incorrect', 400);
          }

          // Prepare the specification data structure
          const specificationData = {
            brand: currentBrand, // The current brand (e.g., Dawlance)
            name: data.name, // Product name
            price: priceInNumber, // Numeric price or 0 if 'N/A'
            image: data.image, // Image URL
            category: 'WASHING_MACHINE', // Category of the product
            data: {
              // General Specs (optional field)
              general: (data.general ?? []).map(([name, value]) => ({ name, value })),
              // Compatibility (optional field, if provided)
              compatibility: (data.compatibility ?? []).map(([name, value]) => ({ name, value })),
              // Connectors (optional field, if provided)
              connectors: (data.connectors ?? []).map(([name, value]) => ({ name, value })),
              // Dimensions (optional field, if provided)
              dimensions: (data.dimensions ?? []).map(([name, value]) => ({ name, value })),
              // Memory (optional field, if provided)
              memory: (data.memory ?? []).map(([name, value]) => ({ name, value })),
              // Miscellaneous (optional field, if provided)
              miscellaneous: (data.miscellaneous ?? []).map(([name, value]) => ({ name, value })),
              // Links (optional field, if provided)
              links: (data.links ?? []).map(([name, value]) => ({ name, value }))
            }
          };

          // Create a new Specification document for the current washing machine data and brand
          const newSpecification = new Specification(specificationData);

          // Save the new specification data to the database
          await newSpecification.save();
        }
      }

      // Return success response after processing all washing machines
      res.status(201).json({
        success: true,
        message: 'Data added successfully',
      });

    } catch (error) {
      // Handle errors
      return this.handleError(next, error.message);
    }
  }

  async vaccumCleaner(req, res, next) {
    try {
      // Get data from the request body
      const body = req.body;

      // Iterate over each brand data
      for (const brandData of body) {

        const { brand: currentBrand, vaccum_cleaners } = brandData;

        // Validate if vaccum_cleaners data is provided for each brand
        if (!Array.isArray(vaccum_cleaners) || vaccum_cleaners.length === 0) {
          return this.handleError(next, `Vaccum cleaner data is required for brand ${currentBrand}`, 400);
        }

        // Iterate over each vaccum cleaner data for the current brand
        for (const vaccum of vaccum_cleaners) {
          const { country, data } = vaccum;

          // Validate if data contains necessary fields
          if (!data || !data.name || !data.price || !data.image) {
            return this.handleError(next, 'Vaccum cleaner data must include name, price, and image', 400);
          }

          // Convert price (remove commas and currency symbols, then parse as number)
          let priceInNumber = 0;
          if (data.price && data.price !== 'N/A') {
            priceInNumber = parseFloat(data.price.replace(/[^\d.-]/g, ''));
          }

          if (isNaN(priceInNumber) && data.price !== 'N/A') {
            return this.handleError(next, 'Price format is incorrect', 400);
          }

          // Prepare the specification data structure
          const specificationData = {
            brand: currentBrand, // The current brand (e.g., Dawlance)
            name: data.name, // Product name
            price: priceInNumber, // Numeric price or 0 if 'N/A'
            image: data.image, // Image URL
            category: 'VACCUM_CLEANER', // Category of the product
            data: {
              // General Specs (optional field)
              general: (data.general ?? []).map(([name, value]) => ({ name, value })),
              // Compatibility (optional field, if provided)
              compatibility: (data.compatibility ?? []).map(([name, value]) => ({ name, value })),
              // Connectors (optional field, if provided)
              connectors: (data.connectors ?? []).map(([name, value]) => ({ name, value })),
              // Dimensions (optional field, if provided)
              dimensions: (data.dimensions ?? []).map(([name, value]) => ({ name, value })),
              // Memory (optional field, if provided)
              memory: (data.memory ?? []).map(([name, value]) => ({ name, value })),
              // Miscellaneous (optional field, if provided)
              miscellaneous: (data.miscellaneous ?? []).map(([name, value]) => ({ name, value })),
              // Links (optional field, if provided)
              links: (data.links ?? []).map(([name, value]) => ({ name, value }))
            }
          };

          // Create a new Specification document for the current vaccum cleaner data and brand
          const newSpecification = new Specification(specificationData);

          // Save the new specification data to the database
          await newSpecification.save();
        }
      }

      // Return success response after processing all vaccum cleaners
      res.status(201).json({
        success: true,
        message: 'Data added successfully',
      });

    } catch (error) {
      // Handle errors
      return this.handleError(next, error.message);
    }
  }

  async tripod(req, res, next) {
    try {
      // Get data from the request body
      const body = req.body;

      // Iterate over each brand data
      for (const brandData of body) {

        const { brand: currentBrand, tripod: tripods } = brandData;

        // Validate if tripod data is provided for each brand
        if (!Array.isArray(tripods) || tripods.length === 0) {
          return this.handleError(next, `Tripod data is required for brand ${currentBrand}`, 400);
        }

        // Iterate over each tripod data for the current brand
        for (const trip of tripods) {
          const { country, data } = trip;

          // Validate if data contains necessary fields
          if (!data || !data.name || !data.price || !data.image) {
            return this.handleError(next, 'Tripod data must include name, price, and image', 400);
          }

          // Convert price (remove commas and currency symbols, then parse as number)
          let priceInNumber = 0;
          if (data.price && data.price !== 'N/A') {
            priceInNumber = parseFloat(data.price.replace(/[^\d.-]/g, ''));
          }

          if (isNaN(priceInNumber) && data.price !== 'N/A') {
            return this.handleError(next, 'Price format is incorrect', 400);
          }

          // Prepare the specification data structure
          const specificationData = {
            brand: currentBrand, // The current brand (e.g., Beiki, Benro)
            name: data.name, // Product name
            price: priceInNumber, // Numeric price or 0 if 'N/A'
            image: data.image, // Image URL
            category: 'TRIPOD', // Category of the product
            data: {
              // General Specs (optional field)
              general: (data['general specs'] ?? []).map(([name, value]) => ({ name, value })),
              // Compatibility (optional field, if provided)
              compatibility: (data.compatibility ?? []).map(([name, value]) => ({ name, value })),
              // Connectors (optional field, if provided)
              connectors: (data.connectors ?? []).map(([name, value]) => ({ name, value })),
              // Dimensions (optional field, if provided)
              dimensions: (data.dimensions ?? []).map(([name, value]) => ({ name, value })),
              // Memory (optional field, if provided)
              memory: (data.memory ?? []).map(([name, value]) => ({ name, value })),
              // Miscellaneous (optional field, if provided)
              miscellaneous: (data.miscellaneous ?? []).map(([name, value]) => ({ name, value })),
              // Links (optional field, if provided)
              links: (data.links ?? []).map(([name, value]) => ({ name, value }))
            }
          };

          // Create a new Specification document for the current tripod data and brand
          const newSpecification = new Specification(specificationData);

          // Save the new specification data to the database
          await newSpecification.save();
        }
      }

      // Return success response after processing all tripods
      res.status(201).json({
        success: true,
        message: 'Data added successfully',
      });

    } catch (error) {
      // Handle errors
      return this.handleError(next, error.message);
    }
  }

  async toners(req, res, next) {
    try {
      // Get data from the request body
      const body = req.body;

      // Iterate over each brand data
      for (const brandData of body) {

        const { brand: currentBrand, toners_and_cartridges } = brandData;

        // Validate if toner data is provided for each brand
        if (!Array.isArray(toners_and_cartridges) || toners_and_cartridges.length === 0) {
          return this.handleError(next, `Toner data is required for brand ${currentBrand}`, 400);
        }

        // Iterate over each toner data for the current brand
        for (const toner of toners_and_cartridges) {
          const { country, data } = toner;

          // Validate if data contains necessary fields
          if (!data || !data.name || !data.price || !data.image) {
            return this.handleError(next, 'Toner data must include name, price, and image', 400);
          }

          // Convert price (remove commas and currency symbols, then parse as number)
          let priceInNumber = 0;
          if (data.price && data.price !== 'N/A') {
            priceInNumber = parseFloat(data.price.replace(/[^\d.-]/g, ''));
          }

          if (isNaN(priceInNumber) && data.price !== 'N/A') {
            return this.handleError(next, 'Price format is incorrect', 400);
          }

          // Prepare the specification data structure
          const specificationData = {
            brand: currentBrand, // The current brand (e.g., Beiki, Benro)
            name: data.name, // Product name
            price: priceInNumber, // Numeric price or 0 if 'N/A'
            image: data.image, // Image URL
            category: 'TONERS_AND_CARTRIDGES', // Category of the product
            data: {
              // General Specs (optional field)
              general: (data['general specs'] ?? []).map(([name, value]) => ({ name, value })),
              // Compatibility (optional field, if provided)
              compatibility: (data.compatibility ?? []).map(([name, value]) => ({ name, value })),
              // Connectors (optional field, if provided)
              connectors: (data.connectors ?? []).map(([name, value]) => ({ name, value })),
              // Dimensions (optional field, if provided)
              dimensions: (data.dimensions ?? []).map(([name, value]) => ({ name, value })),
              // Memory (optional field, if provided)
              memory: (data.memory ?? []).map(([name, value]) => ({ name, value })),
              // Miscellaneous (optional field, if provided)
              miscellaneous: (data.miscellaneous ?? []).map(([name, value]) => ({ name, value })),
              // Links (optional field, if provided)
              links: (data.links ?? []).map(([name, value]) => ({ name, value }))
            }
          };

          // Create a new Specification document for the current toner data and brand
          const newSpecification = new Specification(specificationData);

          // Save the new specification data to the database
          await newSpecification.save();
        }
      }

      // Return success response after processing all toners
      res.status(201).json({
        success: true,
        message: 'Data added successfully',
      });

    } catch (error) {
      // Handle errors
      return this.handleError(next, error.message);
    }
  }

  async tablet(req, res, next) {
    try {
      // Get data from the request body
      const body = req.body;

      // Iterate over each brand data
      for (const brandData of body) {

        const { brand: currentBrand, tablets } = brandData;

        // Validate if toner data is provided for each brand
        if (!Array.isArray(tablets) || tablets.length === 0) {
          return this.handleError(next, `Toner data is required for brand ${currentBrand}`, 400);
        }

        // Iterate over each toner data for the current brand
        for (const toner of tablets) {
          const { country, data } = toner;

          // Validate if data contains necessary fields
          if (!data || !data.name || !data.price || !data.image) {
            return this.handleError(next, 'Tablet data must include name, price, and image', 400);
          }

          // Convert price (remove commas and currency symbols, then parse as number)
          let priceInNumber = 0;
          if (data.price && data.price !== 'N/A') {
            priceInNumber = parseFloat(data.price.replace(/[^\d.-]/g, ''));
          }

          if (isNaN(priceInNumber) && data.price !== 'N/A') {
            return this.handleError(next, 'Price format is incorrect', 400);
          }

          // Prepare the specification data structure
          const specificationData = {
            brand: currentBrand, // The current brand (e.g., Beiki, Benro)
            name: data.name, // Product name
            price: priceInNumber, // Numeric price or 0 if 'N/A'
            image: data.image, // Image URL
            category: 'TABLET', // Category of the product
            data: {
              // General Specs
              generalSpecs: (data['general specs'] ?? []).map(([name, value]) => ({ name, value })),
              // Display Specs
              display: (data.display ?? []).map(([name, value]) => ({ name, value })),
              // Processor Specs
              processor: (data.processor ?? []).map(([name, value]) => ({ name, value })),
              // Memory Specs
              memory: (data.memory ?? []).map(([name, value]) => ({ name, value })),
              // Storage Specs
              storage: (data.storage ?? []).map(([name, value]) => ({ name, value })),
              // Camera Specs
              camera: (data.camera ?? []).map(([name, value]) => ({ name, value })),
              // Communication Specs
              communication: (data.communication ?? []).map(([name, value]) => ({ name, value })),
              // Feature Specs
              features: (data.features ?? []).map(([name, value]) => ({ name, value })),
              // Connectors
              connectors: (data.connectors ?? []).map(([name, value]) => ({ name, value })),
              // Design Specs
              design: (data.design ?? []).map(([name, value]) => ({ name, value })),
              // Dimensions
              dimensions: (data.dimensions ?? []).map(([name, value]) => ({ name, value })),
              // Power Supply
              powerSupply: (data['power supply'] ?? []).map(([name, value]) => ({ name, value })),
              // General Specs (optional)
              generalSpecs: (data.general ?? []).map(([name, value]) => ({ name, value })),
              // Audio Features
              audioFeatures: (data['audio features'] ?? []).map(([name, value]) => ({ name, value })),
              // Miscellaneous Specs
              miscellaneous: (data.miscellaneous ?? []).map(([name, value]) => ({ name, value })),
              // Links
              links: (data.links ?? []).map(([name, value]) => ({ name, value })),
              
              general: (data.general ?? []).map(([name, value]) => ({ name, value }))
            }
          };

          // Create a new Specification document for the current toner data and brand
          const newSpecification = new Specification(specificationData);

          // Save the new specification data to the database
          await newSpecification.save();
        }
      }

      // Return success response after processing all toners
      res.status(201).json({
        success: true,
        message: 'Data added successfully',
      });

    } catch (error) {
      // Handle errors
      return this.handleError(next, error.message);
    }
  }

  async tabletOtherAccessories(req, res, next) {
    try {
      // Get data from the request body
      const body = req.body;

      // Iterate over each brand data
      for (const brandData of body) {

        const { brand: currentBrand, tablet_other_accessories } = brandData;

        // Validate if toner data is provided for each brand
        if (!Array.isArray(tablet_other_accessories) || tablet_other_accessories.length === 0) {
          return this.handleError(next, `tablet_other_accessories data is required for brand ${currentBrand}`, 400);
        }

        // Iterate over each toner data for the current brand
        for (const toner of tablet_other_accessories) {
          const { country, data } = toner;

          // Validate if data contains necessary fields
          if (!data || !data.name || !data.price || !data.image) {
            return this.handleError(next, 'tablet_other_accessories data must include name, price, and image', 400);
          }

          // Convert price (remove commas and currency symbols, then parse as number)
          let priceInNumber = 0;
          if (data.price && data.price !== 'N/A') {
            priceInNumber = parseFloat(data.price.replace(/[^\d.-]/g, ''));
          }

          if (isNaN(priceInNumber) && data.price !== 'N/A') {
            return this.handleError(next, 'Price format is incorrect', 400);
          }

          // Prepare the specification data structure
          const specificationData = {
            brand: currentBrand, // The current brand (e.g., Beiki, Benro)
            name: data.name, // Product name
            price: priceInNumber, // Numeric price or 0 if 'N/A'
            image: data.image, // Image URL
            category: 'TABLET_OTHER_ACCESSORIES', // Category of the product
            data: {
              // General Specs
              generalSpecs: (data['general specs'] ?? []).map(([name, value]) => ({ name, value })),
              // Display Specs
              display: (data.display ?? []).map(([name, value]) => ({ name, value })),
              // Processor Specs
              processor: (data.processor ?? []).map(([name, value]) => ({ name, value })),
              // Memory Specs
              memory: (data.memory ?? []).map(([name, value]) => ({ name, value })),
              // Storage Specs
              storage: (data.storage ?? []).map(([name, value]) => ({ name, value })),
              // Camera Specs
              camera: (data.camera ?? []).map(([name, value]) => ({ name, value })),
              // Communication Specs
              communication: (data.communication ?? []).map(([name, value]) => ({ name, value })),
              // Feature Specs
              features: (data.features ?? []).map(([name, value]) => ({ name, value })),
              // Connectors
              connectors: (data.connectors ?? []).map(([name, value]) => ({ name, value })),
              // Design Specs
              design: (data.design ?? []).map(([name, value]) => ({ name, value })),
              // Dimensions
              dimensions: (data.dimensions ?? []).map(([name, value]) => ({ name, value })),
              // Power Supply
              powerSupply: (data['power supply'] ?? []).map(([name, value]) => ({ name, value })),
              // General Specs (optional)
              generalSpecs: (data.general ?? []).map(([name, value]) => ({ name, value })),
              // Audio Features
              audioFeatures: (data['audio features'] ?? []).map(([name, value]) => ({ name, value })),
              // Miscellaneous Specs
              miscellaneous: (data.miscellaneous ?? []).map(([name, value]) => ({ name, value })),
              // Links
              links: (data.links ?? []).map(([name, value]) => ({ name, value })),
              
              general: (data.general ?? []).map(([name, value]) => ({ name, value }))
            }
          };

          // Create a new Specification document for the current toner data and brand
          const newSpecification = new Specification(specificationData);

          // Save the new specification data to the database
          await newSpecification.save();
        }
      }

      // Return success response after processing all toners
      res.status(201).json({
        success: true,
        message: 'Data added successfully',
      });

    } catch (error) {
      // Handle errors
      return this.handleError(next, error.message);
    }
  }

  async universal(req, res, next) {
    try {
      // Get data from the request body
      const { data, category } = req.body;
      
      if (!category) {
        return this.handleError(next, `Category is required`, 400);
      }

      // Iterate over each brand data
      for (const brandData of data) {

        const { brand: currentBrand, dataList } = brandData;

        // Validate if toner data is provided for each brand
        if (!Array.isArray(dataList) || dataList.length === 0) {
          return this.handleError(next, `dataList is required for brand ${currentBrand}`, 400);
        }

        // Iterate over each toner data for the current brand
        for (const toner of dataList) {
          const { country, data } = toner;

          // Validate if data contains necessary fields
          if (!data || !data.name || !data.price || !data.image) {
            return this.handleError(next, 'dataList must include name, price, and image', 400);
          }

          // Convert price (remove commas and currency symbols, then parse as number)
          let priceInNumber = 0;
          if (data.price && data.price !== 'N/A') {
            priceInNumber = parseFloat(data.price.replace(/[^\d.-]/g, ''));
          }

          if (isNaN(priceInNumber) && data.price !== 'N/A') {
            return this.handleError(next, 'Price format is incorrect', 400);
          }
          console.log(data['general specs']);
          
          // Prepare the specification data structure
          const specificationData = {
            brand: currentBrand, // The current brand (e.g., Beiki, Benro)
            name: data.name, // Product name
            price: priceInNumber, // Numeric price or 0 if 'N/A'
            image: data.image, // Image URL
            category: category, // Category of the product
            data: {
              // General Specs
              generalSpecs: (data['general specs'] ?? []).map(([name, value]) => ({ name, value })),
              // Display Specs
              display: (data.display ?? []).map(([name, value]) => ({ name, value })),
              // Processor Specs
              processor: (data.processor ?? []).map(([name, value]) => ({ name, value })),
              // Memory Specs
              memory: (data.memory ?? []).map(([name, value]) => ({ name, value })),
              // Storage Specs
              storage: (data.storage ?? []).map(([name, value]) => ({ name, value })),
              // Camera Specs
              camera: (data.camera ?? []).map(([name, value]) => ({ name, value })),
              // Communication Specs
              communication: (data.communication ?? []).map(([name, value]) => ({ name, value })),
              // Feature Specs
              features: (data.features ?? []).map(([name, value]) => ({ name, value })),
              // Connectors
              connectors: (data.connectors ?? []).map(([name, value]) => ({ name, value })),
              // Design Specs
              design: (data.design ?? []).map(([name, value]) => ({ name, value })),
              // Dimensions
              dimensions: (data.dimensions ?? []).map(([name, value]) => ({ name, value })),
              // Power Supply
              powerSupply: (data['power supply'] ?? []).map(([name, value]) => ({ name, value })),
              // General (optional)
              general: (data.general ?? []).map(([name, value]) => ({ name, value })),
              // Audio Features
              audioFeatures: (data['audio features'] ?? []).map(([name, value]) => ({ name, value })),
              // Miscellaneous Specs
              miscellaneous: (data.miscellaneous ?? []).map(([name, value]) => ({ name, value })),
              // Links
              links: (data.links ?? []).map(([name, value]) => ({ name, value })),
            
            }
          };

          // Create a new Specification document for the current toner data and brand
          const newSpecification = new Specification(specificationData);

          // Save the new specification data to the database
          await newSpecification.save();
        }
      }

      // Return success response after processing all toners
      res.status(201).json({
        success: true,
        message: 'Data added successfully',
      });

    } catch (error) {
      // Handle errors
      return this.handleError(next, error.message);
    }
  }









}

export default new SpecificationController();
