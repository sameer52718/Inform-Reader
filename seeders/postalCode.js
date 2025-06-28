import BaseController from "../BaseController.js";
import multer from "multer";
import { Agenda } from "agenda";
import PostalCode from "../models/PostalCode.js";
import Country from "../models/Country.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Configure multer for file upload
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({
  dest: path.join(__dirname, "../../tmp/uploads/"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/json") {
      return cb(new Error("Only JSON files are allowed"));
    }
    cb(null, true);
  },
});

// Initialize Agenda
const agenda = new Agenda({ db: { address: process.env.MONGO_DB_URL } });

// Define Agenda job for insertion only
agenda.define("insertPostalCodes", async (job) => {
  const { postalCodeDocs, filePath } = job.attrs.data;

  try {
    // Insert in batches with duplicate checks
    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < postalCodeDocs.length; i += batchSize) {
      const batch = postalCodeDocs.slice(i, i + batchSize);

      // Check for duplicates and insert
      for (const doc of batch) {
        const existing = await PostalCode.findOne({
          countryId: doc.countryId,
          code: doc.code,
          area: doc.area,
        });

        if (!existing) {
          await PostalCode.create(doc);
          insertedCount++;
        }
      }

      console.log(`✅ Processed batch ${i / batchSize + 1} (${batch.length} records, ${insertedCount} inserted)`);
    }

    console.log(`🎉 Finished inserting ${insertedCount} postal codes`);
  } catch (error) {
    console.error("❌ Error in Agenda job:", error.message);
    throw error;
  } finally {
    // Clean up uploaded file
    fs.unlinkSync(filePath);
  }
});

class PostalCodeController extends BaseController {
  constructor() {
    super();
    // Start Agenda
    agenda.start();
  }

  // Middleware to handle file upload
  uploadFile = upload.single("file");

  async insert(req, res, next) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Read and validate JSON file
      const rawData = fs.readFileSync(req.file.path);
      const postalCodes = JSON.parse(rawData);

      // Validate JSON structure
      for (const entry of postalCodes) {
        if (!entry.country) {
          throw new Error(`Missing required field: country`);
        }
        if (!entry.region || !entry.region.postalCodes || !Array.isArray(entry.region.postalCodes)) {
          throw new Error(`Invalid or missing region data for country: ${entry.country}`);
        }
        for (const code of entry.region.postalCodes) {
          if (!code.place || !code.code) {
            throw new Error(`Missing required fields in postal code for ${entry.country}: place or code`);
          }
        }
      }

      // Get unique country names
      const countryNames = [...new Set(postalCodes.map((entry) => entry.country))];

      // Fetch countries
      const countries = await Country.find({ name: { $in: countryNames } }).select("_id name");
      const countryMap = new Map(countries.map((c) => [c.name, c._id]));

      // Build postal code documents
      const postalCodeDocs = [];
      for (const entry of postalCodes) {
        const countryId = countryMap.get(entry.country);
        if (!countryId) {
          console.warn(`⚠️ Country not found: ${entry.country}`);
          continue;
        }

        const region = entry.region;
        for (const code of region.postalCodes) {
          postalCodeDocs.push({
            countryId,
            state: region.regionName || null,
            area: code.place,
            code: code.code,
          });
        }
      }

      // Schedule Agenda job for insertion
      await agenda.schedule("in 1 minute", "insertPostalCodes", {
        postalCodeDocs,
        filePath: req.file.path,
      });

      return res.status(202).json({
        message: "Postal code insertion job scheduled successfully",
      });
    } catch (error) {
      // Clean up file if error occurs
      if (req.file) fs.unlinkSync(req.file.path);
      this.handleError(next, error.message);
    }
  }
}

export default new PostalCodeController();