import BaseController from '../BaseController.js';
import Software from '../../models/Software.js';

class SoftwareController extends BaseController {
  constructor() {
    super();
    this.insert = this.insert.bind(this);
  }

  // async insert(req, res, next) {
  //     try {
  //         const data = req.body; // Expecting an array of software objects

  //         // Validate input
  //         if (!Array.isArray(data) || data.length === 0) {
  //             return res.status(400).json({
  //                 success: false,
  //                 message: "Invalid request: Expected an array of software data.",
  //             });
  //         }

  //         // Function to generate slug from name
  //         const generateSlug = (name) => {
  //             return name
  //                 .toLowerCase() // Convert name to lowercase
  //                 .replace(/\s+/g, '-') // Replace spaces with hyphens
  //                 .replace(/[^\w\-]+/g, '') // Remove non-alphanumeric characters
  //                 .replace(/\-\-+/g, '-') // Replace multiple hyphens with a single hyphen
  //                 .replace(/^-+/, '') // Remove hyphens from the start
  //                 .replace(/-+$/, ''); // Remove hyphens from the end
  //         };

  //         // Generate slugs for each software entry
  //         const softwareToInsert = await Promise.all(data.map(async (software) => {
  //             software.slug = generateSlug(software.name);

  //             // Check if the slug already exists in the database
  //             const existingSoftware = await Software.findOne({ slug: software.slug }).lean();
  //             if (existingSoftware) {
  //                 // If the slug exists, append a number to make it unique
  //                 let count = 1;
  //                 let newSlug = `${software.slug}-${count}`;
  //                 while (await Software.findOne({ slug: newSlug }).lean()) {
  //                     count++;
  //                     newSlug = `${software.slug}-${count}`;
  //                 }
  //                 software.slug = newSlug;
  //             }
  //             return software;
  //         }));

  //         // Insert the modified data using insertMany
  //         await Software.insertMany(softwareToInsert);

  //         res.status(201).json({
  //             success: true,
  //             message: "Software entries added successfully",
  //         });
  //     } catch (error) {
  //         return this.handleError(next, error);
  //     }
  // }

  async insert(req, res, next) {
    try {
      const data = req.body; // Expecting an array of software objects

      // Validate input
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request: Expected an array of software data.',
        });
      }

      // Insert the modified data using insertMany
      await Software.insertMany(data);

      res.status(201).json({
        success: true,
        message: 'Software entries added successfully',
      });
    } catch (error) {
      return this.handleError(next, error);
    }
  }
}

export default new SoftwareController();
