import BaseController from '../BaseController.js';
import User from '../../models/User.js';
import City from '../../models/City.js';
import csvParser from 'csv-parser';
import { PassThrough } from 'stream';

class CommonController extends BaseController {
  constructor() {
    super();
    this.getSession = this.getSession.bind(this);
    this.importCity = this.importCity.bind(this);
    this.getCity = this.getCity.bind(this);
    this.getProvince = this.getProvince.bind(this);
  }

  async getSession(req, res, next) {
    try {
      const token = req.headers.authorization;

      if (!token) {
        return res.status(401).json({ error: true, message: 'No token, authorization denied' });
      }

      const decoded = this.verifyToken(token);

      let user;

      switch (decoded.type) {
        case this.userTypes.user:
        case this.userTypes.poster:
          user = await User.findById(decoded.id);
          break;
        default:
          break;
      }

      return res.json({ error: false, data: user });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async importCity(req, res, next) {
    try {
      const files = req.files;

      // Debugging: Log the files object
      console.log('Uploaded files:', files);

      if (!files || !files.length) {
        return res.status(400).json({ error: true, message: 'No files uploaded' });
      }

      const fileBuffer = files[0].buffer;
      const cityList = [];

      // Convert buffer to readable stream using PassThrough
      const readable = new PassThrough();
      readable.end(fileBuffer);

      // Parse CSV data
      readable
        .pipe(csvParser())
        .on('data', (row) => {
          const cityData = {
            city: row.city,
            province: row.province_name,
            location: {
              type: 'Point',
              coordinates: [parseFloat(row.lng), parseFloat(row.lat)],
            },
          };

          // Add to cityList if both fields are valid
          if (cityData.city && cityData.province && !isNaN(cityData.location.coordinates[0]) && !isNaN(cityData.location.coordinates[1])) {
            cityList.push(cityData);
          }
        })
        .on('end', async () => {
          try {
            // Insert data into MongoDB
            await City.insertMany(cityList);
            return res.json({ error: false, message: cityList });
          } catch (dbError) {
            return next(new Error(`Database error: ${dbError.message}`));
          }
        })
        .on('error', (err) => {
          return next(new Error(`Error parsing CSV file: ${err.message}`));
        });
    } catch (error) {
      return next(new Error(`Server error: ${error.message}`));
    }
  }

  async getCity(req, res, next) {
    try {
      // Fetch all cities and provinces from the database
      const cities = await City.find({}).select('-createdAt -updatedAt -province');

      return res.json({ error: false, data: cities });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async getProvince(req, res, next) {
    try {
      // Fetch distinct provinces from the City collection
      const provinces = await City.distinct('province');

      return res.json({ error: false, province: provinces });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }
}

export default new CommonController();
