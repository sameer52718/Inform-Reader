import BaseController from '../BaseController.js';
import Country from '../../models/Country.js';
import Type from '../../models/Type.js';
import Category from '../../models/Category.js';
import SubCategory from '../../models/SubCategory.js';
import Brand from '../../models/Brand.js';
import Religion from '../../models/Religion.js';
import Company from '../../models/Company.js';
import Model from '../../models/Model.js';
import Make from '../../models/Make.js';
import Config from '../../models/Config.js';
import City from '../../models/City.js';
import Nationality from '../../models/Nationality.js';
import Advertisement from '../../models/Advertisement.js';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import qs from "qs";
import { XMLParser } from "fast-xml-parser";
import dotenv from 'dotenv';
import CouponFeed from "../../models/CouponFeed.js";

dotenv.config();

class CommonController extends BaseController {
  constructor() {
    super();
    this.country = this.country.bind(this);
    this.type = this.type.bind(this);
    this.category = this.category.bind(this);
    this.subCategory = this.subCategory.bind(this);
    this.brand = this.brand.bind(this);
    this.religion = this.religion.bind(this);
    this.company = this.company.bind(this);
    this.make = this.make.bind(this);
    this.model = this.model.bind(this);
    this.getConfig = this.getConfig.bind(this);
    this.cities = this.cities.bind(this);
    this.translateContent = this.translateContent.bind(this);
    this.nationality = this.nationality.bind(this);
    this.advertiser = this.advertiser.bind(this);
    this.coupon = this.coupon.bind(this);
  }

  async advertiser(req, res, next) {
    try {
      const headers = {
        Authorization: `Bearer ${process.env.CJ_TOKEN}`, // Use env variable for security
        Accept: 'application/xml', // v2 returns XML
      };

      // Step 1: Call Advertiser Lookup API
      const url = `https://advertiser-lookup.api.cj.com/v2/advertiser-lookup?requestor-cid=${process.env.CJ_CID}&advertiser-ids=joined`;
      const response = await axios.get(url, { headers });

      // Step 2: Parse XML response
      const parsedData = await parseStringPromise(response.data);
      const advertisers = parsedData['cj-api'].advertisers[0].advertiser || [];

      console.log(`Found ${advertisers.length} advertisers.`);

      // Step 3: Map and store advertisers
      const storedAdvertisers = [];
      for (const adv of advertisers) {
        const advertiserData = {
          advertiserId: adv['advertiser-id'][0],
          advertiserName: adv['advertiser-name'][0],
          programName: adv['program-name']?.[0] || '',
          programUrl: adv['program-url']?.[0] || '',
          accountStatus: adv['account-status']?.[0] || '',
          sevenDayEpc: adv['seven-day-epc']?.[0] || '0.00',
          threeMonthEpc: adv['three-month-epc']?.[0] || '0.00',
          language: adv.language?.[0] || '',
          relationshipStatus: adv['relationship-status']?.[0] || '',
          mobileTrackingCertified: adv['mobile-tracking-certified']?.[0] === 'true',
          cookielessTrackingEnabled: adv['cookieless-tracking-enabled']?.[0] === 'true',
          networkRank: adv['network-rank']?.[0] || '0',
          primaryCategory: {
            parent: adv['primary-category']?.[0]?.parent?.[0] || 'Unknown',
            child: adv['primary-category']?.[0]?.child?.[0] || 'Unknown',
          },
          performanceIncentives: adv['performance-incentives']?.[0] === 'true',
          actions: adv.actions?.[0]?.action?.map((action) => ({
            name: action.name[0],
            type: action.type[0],
            id: action.id[0],
            commission: {
              default: action.commission[0].default?.[0] || '0.00%',
              itemlist: action.commission[0].itemlist?.map((item) => ({
                value: item._ || '0.00',
                name: item.$?.name || '',
                id: item.$?.id || '',
              })) || [],
            },
          })) || [],
          linkTypes: adv['link-types']?.[0]?.['link-type'] || [],
        };

        // Step 4: Store/Update in MongoDB (no duplicates)
        const updatedAdvertiser = await Advertisement.findOneAndUpdate(
          { advertiserId: advertiserData.advertiserId },
          advertiserData,
          { upsert: true, new: true, runValidators: true }
        );
        storedAdvertisers.push(updatedAdvertiser);

        console.log(`Stored/Updated: ${advertiserData.advertiserName}`);

        // Delay to avoid rate limits (25 calls/minute)
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      return res.json({
        error: false,
        message: 'Advertisers stored successfully',
        count: storedAdvertisers.length,
        advertisers: storedAdvertisers,
      });
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      return res.status(500).json({
        error: true,
        message: error.message || 'Internal Server Error',
      });
    }
  }

  async coupon(req, res, next) {
    try {
      const bearerToken =
        "TVhIUmdPenFyUVdJRTREOUttQ3k2ZE1FZ0xhc1VwMTY6QUlUemxGQjk4b0dBY0VneVdWVnpPRWFoR1BCZGNVNGk=";

      const data = qs.stringify({
        grant_type: "password",
        scope: "4571385",
      });

      // Step 1: Get token
      const tokenResponse = await axios.post("https://api.linksynergy.com/token", data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${bearerToken}`,
        },
      });

      const accessToken = tokenResponse.data.access_token;

      // Step 2: Get coupons
      const couponUrl = "https://api.linksynergy.com/coupon/1.0";
      const couponParams = {
        sid: process.env.RAKUTEN_PUBLISHER_SID,
      };

      const couponResponse = await axios.get(couponUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/xml",
        },
        params: couponParams,
      });

      // Step 3: Parse XML → JSON
      const parser = new XMLParser();
      const couponData = parser.parse(couponResponse.data);

      // Extract coupons
      const links = couponData?.couponfeed?.link || [];

      if (links.length > 0) {
        // Step 4: Save each coupon to DB
        for (const link of links) {
          const existing = await CouponFeed.findOne({
            advertiserid: link.advertiserid,
            offerdescription: link.offerdescription,
            couponcode: link.couponcode,
          });

          // Avoid duplicates
          if (!existing) {
            await CouponFeed.create({
              categories: link.categories || {},
              promotiontypes: link.promotiontypes || {},
              offerdescription: link.offerdescription,
              offerstartdate: link.offerstartdate,
              offerenddate: link.offerenddate,
              couponcode: link.couponcode || null,
              clickurl: link.clickurl,
              impressionpixel: link.impressionpixel,
              advertiserid: link.advertiserid,
              advertisername: link.advertisername,
              network: link.network,
            });
          }
        }
      }

      // Step 5: Fetch advertiser info (optional)
      const advertiseResponse = await axios.get("https://api.linksynergy.com/v2/advertisers", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/xml",
        },
      });
      const advertiseData = parser.parse(advertiseResponse.data);

      return res.json({
        error: false,
        token: tokenResponse.data,
        coupons: couponData,
        advertiseData,
      });
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      return this.handleError(next, error, 500);
    }
  }


  // async coupon(req, res, next) {
  //   try {
  //     // Validate environment variables
  //     const required = ['RAKUTEN_CLIENT_ID', 'RAKUTEN_CLIENT_SECRET', 'RAKUTEN_REFRESH_TOKEN', 'RAKUTEN_PUBLISHER_SID', 'RAKUTEN_REDIRECT_URI'];
  //     for (let varName of required) {
  //       if (!process.env[varName]) throw new Error(`Missing environment variable: ${varName}`);
  //     }

  //     console.log('Environment Variables:', {
  //       client_id: process.env.RAKUTEN_CLIENT_ID,
  //       refresh_token: process.env.RAKUTEN_REFRESH_TOKEN ? '[REDACTED]' : undefined,
  //       sid: process.env.RAKUTEN_PUBLISHER_SID,
  //       redirect_uri: process.env.RAKUTEN_REDIRECT_URI,
  //     });

  //     // Step 1: Try refreshing token with multiple scopes
  //     const tokenUrl = 'https://api.linksynergy.com/token';
  //     const scopes = ['publisher', process.env.RAKUTEN_PUBLISHER_SID];
  //     let accessToken, newRefreshToken;

  //     for (let scope of scopes) {
  //       try {
  //         const tokenParams = new URLSearchParams({
  //           grant_type: 'refresh_token',
  //           refresh_token: process.env.RAKUTEN_REFRESH_TOKEN,
  //           client_id: process.env.RAKUTEN_CLIENT_ID,
  //           client_secret: process.env.RAKUTEN_CLIENT_SECRET,
  //           scope,
  //         });

  //         console.log(`Attempting token refresh with scope: ${scope}`);

  //         const tokenResponse = await axios.post(tokenUrl, tokenParams, {
  //           headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //         });

  //         accessToken = tokenResponse.data.access_token;
  //         newRefreshToken = tokenResponse.data.refresh_token;
  //         if (accessToken) {
  //           console.log(`Token refresh successful with scope: ${scope}`);
  //           break;
  //         }
  //       } catch (scopeError) {
  //         console.error(`Token refresh failed with scope ${scope}:`, scopeError.response?.data || scopeError.message);
  //         if (scope === scopes[1]) throw scopeError; // Rethrow if both scopes fail
  //       }
  //     }

  //     if (!accessToken) throw new Error('Failed to obtain access token with any scope');

  //     // Update .env if new refresh token received
  //     if (newRefreshToken && newRefreshToken !== process.env.RAKUTEN_REFRESH_TOKEN) {
  //       try {
  //         const envPath = path.join(process.cwd(), '.env');
  //         let envContent = fs.readFileSync(envPath, 'utf8');
  //         envContent = envContent.replace(/RAKUTEN_REFRESH_TOKEN=.*/, `RAKUTEN_REFRESH_TOKEN=${newRefreshToken}`);
  //         fs.writeFileSync(envPath, envContent);
  //         console.log('Updated .env with new refresh token');
  //       } catch (envError) {
  //         console.warn('Failed to update .env file:', envError.message);
  //       }
  //     }

  //     // Step 2: Fetch coupons
  //     const couponUrl = 'https://api.linksynergy.com/coupon/1.0';
  //     const couponParams = {
  //       sid: process.env.RAKUTEN_PUBLISHER_SID,
  //       // Optional: network: 'US', category: 'coupon'
  //     };

  //     console.log('Coupon Request Params:', couponParams);

  //     const couponResponse = await axios.get(couponUrl, {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //         Accept: 'application/json',
  //       },
  //       params: couponParams,
  //     });

  //     const coupons = couponResponse.data?.coupon || couponResponse.data?.coupons || [];

  //     return res.json({
  //       error: false,
  //       message: 'Coupons retrieved successfully',
  //       count: coupons.length,
  //       coupons,
  //     });
  //   } catch (error) {
  //     console.error('Error in coupon function:', {
  //       message: error.message,
  //       response: error.response?.data,
  //       status: error.response?.status,
  //     });

  //     if (error.message.includes('Converting circular structure to JSON')) {
  //       return res.status(500).json({
  //         error: true,
  //         message: 'Circular structure error in response. Ensure response does not include raw axios response objects.',
  //       });
  //     }

  //     if (error.response?.status === 400 && error.response?.data?.error_description?.includes('Invalid refresh_token')) {
  //       const authUrl = `https://api.linksynergy.com/oauth2/authorize?client_id=${process.env.RAKUTEN_CLIENT_ID}&redirect_uri=${process.env.RAKUTEN_REDIRECT_URI}&response_type=code&scope=publisher`;
  //       return res.status(400).json({
  //         error: true,
  //         message: 'Invalid refresh token. To generate a new one:\n' +
  //           `1. Open this URL in a browser: ${authUrl}\n` +
  //           '2. Log in, authorize, and get the code from the redirect URL.\n' +
  //           '3. Send the code to your /callback endpoint (setup required, see below).\n' +
  //           '4. The /callback will save the refresh_token to .env.\n' +
  //           'Example /callback route:\n' +
  //           'app.get("/callback", async (req, res) => {\n' +
  //           '  const { code } = req.query;\n' +
  //           '  if (!code) return res.status(400).send("No code provided");\n' +
  //           '  try {\n' +
  //           '    const response = await axios.post("https://api.linksynergy.com/token", ' +
  //           'new URLSearchParams({ grant_type: "authorization_code", code, ' +
  //           'client_id: process.env.RAKUTEN_CLIENT_ID, client_secret: process.env.RAKUTEN_CLIENT_SECRET, ' +
  //           'redirect_uri: process.env.RAKUTEN_REDIRECT_URI, scope: "publisher" }), ' +
  //           '{ headers: { "Content-Type": "application/x-www-form-urlencoded" } });\n' +
  //           '    const { refresh_token } = response.data;\n' +
  //           '    fs.writeFileSync(path.join(process.cwd(), ".env"), ' +
  //           '`RAKUTEN_REFRESH_TOKEN=${refresh_token}\\n`, { flag: "a" });\n' +
  //           '    res.send("Refresh token saved to .env");\n' +
  //           '  } catch (error) { res.status(500).send(error.response?.data || error.message); }\n' +
  //           '});',
  //         details: error.response?.data,
  //       });
  //     }

  //     return res.status(500).json({
  //       error: true,
  //       message: error.response?.data?.message || error.message || 'Internal Server Error',
  //       details: error.response?.data,
  //     });
  //   }
  // }

  async country(req, res, next) {
    try {
      const { groupCountry, region, country } = req.query;
      const response = {};

      // If groupCountry is provided, group the countries by region
      if (groupCountry) {
        const groupCountry = await Country.aggregate([
          {
            $group: {
              _id: '$region',
              countries: { $push: { name: '$name', countryCode: '$countryCode', flag: '$flag' } }, // Push country details to the array
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
        response['country'] = await Country.find({});
      }

      return res.json({ error: false, response });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async type(req, res, next) {
    try {
      const types = await Type.find({ status: true }).select('name');
      return res.json({ error: false, types });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async nationality(req, res, next) {
    try {
      const nationalities = await Nationality.find({ status: true }).select('name');
      return res.json({ error: false, nationalities });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async category(req, res, next) {
    const { type } = req.query;

    try {
      const filter = { status: true, isDeleted: false };

      if (type) {
        const categoryType = await Type.findOne({ name: type });
        if (type) {
          filter.typeId = categoryType._id;
        }
      }
      console.log(filter);

      const categories = await Category.find(filter).select('name');
      return res.json({ error: false, categories });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async subCategory(req, res, next) {
    try {
      const filter = { status: true, isDeleted: false };

      if (req.query.categoryId) {
        filter.categoryId = req.query.categoryId;
      }

      if (req.query.category) {
        const category = await Category.findOne({
          name: req.query.category,
          status: true,
          isDeleted: false,
        }).select('name');
        console.log(category, req.query.category);

        if (!category) {
          return res.json({ error: false, subCategories: [] });
        }

        filter.categoryId = category._id;
      }
      console.log(filter);

      const subCategories = await SubCategory.find(filter).select('name ');

      return res.json({ error: false, subCategories });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async brand(req, res, next) {
    try {
      const brands = await Brand.find({ status: true, isDeleted: false }).select('name');
      return res.json({ error: false, brands });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async religion(req, res, next) {
    try {
      const religions = await Religion.find({ status: true }).select('name');
      return res.json({ error: false, religions });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async company(req, res, next) {
    try {
      const companies = await Company.find({ status: true }).select('name');
      return res.json({ error: false, companies });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async make(req, res, next) {
    try {
      const { type = 'CAR' } = req.query;

      const makes = await Make.find({ status: true, type }).select('name');
      return res.json({ error: false, data: makes });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async model(req, res, next) {
    try {
      const { makeId } = req.query;

      const filters = { status: true };

      if (makeId) {
        filters.makeId = makeId;
      }

      const models = await Model.find(filters).select('name');
      return res.json({ error: false, data: models });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async getConfig(req, res, next) {
    try {
      const config = await Config.findOne().select('logo themeColor -_id');
      return res.json({ error: false, data: config });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async cities(req, res, next) {
    try {
      const { country, capital, minPopulation, name } = req.query;
      const filter = { status: true, isDeleted: false };

      // Filter by country (using countryCode)
      if (country) {
        const countryDoc = await Country.findOne({ countryCode: country.toLowerCase() });
        if (countryDoc) {
          filter.country = countryDoc._id;
        } else {
          return res.json({ error: false, cities: [] });
        }
      }

      // Filter by capital (true/false)
      if (capital !== undefined) {
        filter.capital = capital === 'true';
      }

      // Filter by minimum population
      if (minPopulation) {
        const population = parseInt(minPopulation, 10);
        if (!isNaN(population)) {
          filter.population = { $gte: population };
        }
      }

      // Filter by name (case-insensitive partial match)
      if (name) {
        filter.name = { $regex: name, $options: 'i' };
      }

      const cities = await City.find(filter).select('name zone lat lng').populate('country', 'name countryCode region').limit(500);

      return res.json({ error: false, cities });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async translateContent(req, res, next) {
    try {
      const { json, from, to } = req.body;

      if (!json || !from || !to) {
        return res.status(400).json({ error: true, message: 'Missing required fields: json, from, to' });
      }

      const translated = await this.translateRecursive(json, from, to);
      return res.json(translated);
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

}

export default new CommonController();
