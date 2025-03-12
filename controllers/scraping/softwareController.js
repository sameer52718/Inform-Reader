import BaseController from '../BaseController.js';
import Software from '../../models/Software.js';

class SoftwareController extends BaseController {
    constructor() {
        super();
        this.insert = this.insert.bind(this);
    }

    async insert(req, res, next) {
        try {
            const data = req.body;
    
            if (!Array.isArray(data) || data.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid request: Expected an array of software data.",
                });
            }
    
            const generateUniqueSlug = async (slug) => {
                let newSlug = slug;
                let count = 1;
                while (await Software.exists({ slug: newSlug })) {
                    newSlug = `${slug}-${count}`;
                    count++;
                }
                return newSlug;
            };
    
            const softwareToInsert = await Promise.all(
                data.map(async (software) => {
                    software.slug = await generateUniqueSlug(software.slug);
                    return software;
                })
            );
    
            const newSoftware = await Software.insertMany(softwareToInsert);
    
            res.status(201).json({
                success: true,
                message: "Software entries added successfully",
            });
            
        } catch (error) {
            return this.handleError(next, error);
        }
    }

}

export default new SoftwareController();
