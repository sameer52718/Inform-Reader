import Traffic from '../models/Traffic.js';

const storeTraffic = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const endpoint = req.originalUrl;
        const today = new Date().toISOString().split('T')[0];

        const existingEntry = await Traffic.findOne({
            ip,
            endpoint,
            date: { $gte: new Date(today) }
        });

        if (existingEntry) {
            return next();
        }

        const newTraffic = new Traffic({
            ip,
            endpoint
        });

        await newTraffic.save();

        return next();

    } catch (error) {
        console.error('Error storing traffic data:', error);
        return next(error);
    }
};

export default storeTraffic;
