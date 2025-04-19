import Traffic from '../models/Traffic.js';

const storeTraffic = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const endpoint = req.originalUrl;  // Capture the current endpoint
        const today = new Date().toISOString().split('T')[0];  // Current date in YYYY-MM-DD format

        // Check if an entry already exists for this IP and endpoint for today
        const existingEntry = await Traffic.findOne({
            ip,
            endpoint,
            date: { $gte: new Date(today) }
        });

        if (existingEntry) {
            // If an entry exists for this IP and endpoint today, skip saving
            return next();
        }

        // Create a new Traffic entry with just the IP and endpoint
        const newTraffic = new Traffic({
            ip,
            endpoint
        });

        // Save the new traffic entry
        await newTraffic.save();

        // Proceed to the next middleware or route handler
        return next();

    } catch (error) {
        console.error('Error storing traffic data:', error);
        return next(error);  // Pass the error to the next middleware
    }
};

export default storeTraffic;
