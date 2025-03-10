import BaseController from '../BaseController.js';
import BankCode from '../../models/BankCode.js';
import Country from '../../models/Country.js';

class BankCodeController extends BaseController {
    constructor() {
        super();
        this.insert = this.insert.bind(this);
    }

    async insert(req, res, next) {
        try {
            const data = req.body; // Expecting an array of BankCode objects
    
            // Validate that the request body is an array and not empty
            if (!Array.isArray(data) || data.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid request: Expected an array of BankCode data.",
                });
            }
    
            // Function to generate a unique slug if it already exists
            const generateUniqueSlug = async (slug) => {
                let newSlug = slug;
                let count = 1;
                while (await BankCode.exists({ slug: newSlug })) {
                    newSlug = `${slug}-${count}`;
                    count++;
                }
                return newSlug;
            };
    
            // Process each BankCode entry
            const bankCodesToInsert = await Promise.all(
                data.map(async (bankData) => {
                    // Find countryId based on country name
                    const country = await Country.findOne({ name: bankData.country });
    
                    if (!country) {
                        console.log(`❌ Country not found: ${bankData.country}`);
                        return null;
                    }
    
                    // Generate unique slug
                    const slug = await generateUniqueSlug(bankData.bank.replace(/\s+/g, '-').toLowerCase());
    
                    return {
                        countryId: country._id,
                        bank: bankData.bank,
                        city: bankData.city,
                        branch: bankData.branch || "",
                        swiftCode: bankData.swiftCode.toUpperCase(),
                        slug: slug,
                    };
                })
            );
    
            // Remove null values (entries where country was not found)
            const filteredBankCodes = bankCodesToInsert.filter(item => item !== null);
    
            if (filteredBankCodes.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No valid bank data found.",
                });
            }
    
            // Insert multiple BankCode entries at once
            await BankCode.insertMany(filteredBankCodes);
    
            res.status(201).json({
                success: true,
                message: "BankCode entries added successfully",
            });
        } catch (error) {
            return next(error);
        }
    }

}

export default new BankCodeController();
