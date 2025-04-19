import BaseController from '../BaseController.js';
import Country from '../../models/Country.js';
import Software from '../../models/Software.js';
import Name from '../../models/Name.js';

class HomeController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
    }

    async get(req, res, next) {
        try {
            const getRandomCountries = () =>
                Country.aggregate([
                    { $match: { status: true } },
                    { $sample: { size: 10 } },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            flag: 1,
                            countryCode: 1
                        }
                    }
                ]);

            const getRandomSoftware = () =>
                Software.aggregate([
                    {
                        $match: {
                            status: true,
                            isDeleted: false
                        }
                    },
                    { $sample: { size: 10 } },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            logo: 1,
                            overview: 1,
                            version: 1,
                            tag: 1
                        }
                    }
                ]);

            const getRandomNames = () =>
                Name.aggregate([
                    {
                        $match: {
                            status: true,
                            isDeleted: false
                        }
                    },
                    { $sample: { size: 10 } },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            gender: 1,
                            shortMeaning: 1,
                            origion: 1
                        }
                    }
                ]);

            // Run all async tasks in parallel
            const [postalCodeCountry, bankCodeCountry, randomSoftware, randomNames] = await Promise.all([
                getRandomCountries(),
                getRandomCountries(),
                getRandomSoftware(),
                getRandomNames()
            ]);

            return res.status(200).json({
                error: false,
                postalCodeCountry,
                bankCodeCountry,
                randomSoftware,
                randomNames
            });

        } catch (error) {
            return next({
                status: 500,
                message: error.message || "An unexpected error occurred"
            });
        }
    }


}

export default new HomeController();
