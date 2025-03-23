import BaseController from '../BaseController.js';
import Country from '../../models/Country.js';
import Type from '../../models/Type.js';

class CommonController extends BaseController {
  constructor() {
    super();
    this.country = this.country.bind(this);
    this.type = this.type.bind(this);
  }

  async country(req, res, next) {
    try {
      const { groupCountry, region, country } = req.query;
      const response = {};
  
      // If groupCountry is provided, group the countries by region
      if (groupCountry) {
         const groupCountry = await Country.aggregate([
          {
            $group: {
              _id: "$region",
              countries: { $push: { name: "$name", countryCode: "$countryCode", flag: "$flag" } }, // Push country details to the array
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]);

        response['groupCountry'] = groupCountry;
      }
  
      if (region) {
        response['regionCountry'] = await Country.find({ region: region });
      }

      if (country) {
        response['country'] = await Country.find({ });
      }
  
      return res.json({ error: false, response });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async type(req, res, next) {
    try {

      const types = await Type.find({status: true});
      return res.json({ error: false, types });
      
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }
  


}

export default new CommonController();
