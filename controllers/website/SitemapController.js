import Sitemap from '../../models/Sitemap.js';

// Get sitemap by country and type (returns JSON for Next.js)
export const getSitemap = async (req, res) => {
  try {
    const { country, type, page = 1, limit = 50000 } = req.query;
    
    const query = {};
    if (country) query.country = country.toLowerCase();
    if (type) query.type = type;

    // Get total count for pagination info
    const totalCount = await Sitemap.countDocuments(query);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const urls = await Sitemap.find(query)
      .sort({ lastModified: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    if (!urls || urls.length === 0) {
      return res.status(404).json({ 
        error: true, 
        message: 'Sitemap not found',
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: totalPages
        }
      });
    }

    // Return JSON with pagination info
    return res.json({
      error: false,
      data: urls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: totalPages,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('❌ Error fetching sitemap:', err);
    return res.status(500).json({ 
      error: true, 
      message: 'Server error',
      data: []
    });
  }
};

// Get sitemap index (list of available sitemaps by country/type)
export const getSitemapByCountry = async (req, res) => {
  try {
    const { host } = req.query;

    // Get distinct types and counts for the country
    const sitemaps = await Sitemap.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          lastUpdated: { $max: '$lastModified' }
        }
      }
    ]);

    // Calculate how many sitemap files needed (50k URLs per file)
    const sitemapIndex = sitemaps.map((item) => {
      const pages = Math.ceil(item.count / 50000);
      return {
        type: item._id || 'page',
        totalUrls: item.count,
        pages: pages,
        lastUpdated: item.lastUpdated
      };
    });

    return res.json({ error: false, data: sitemapIndex });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

// Get sitemap index info (returns JSON with pagination details)
export const getSitemapIndex = async (req, res) => {
  try {
    const { country } = req.query;
    const query = country ? { country: country.toLowerCase() } : {};

    const sitemaps = await Sitemap.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          lastUpdated: { $max: '$lastModified' }
        }
      }
    ]);

    // Calculate pages needed (50k URLs per sitemap file)
    const sitemapInfo = sitemaps.map((item) => {
      const pages = Math.ceil(item.count / 50000);
      return {
        type: item._id || 'page',
        totalUrls: item.count,
        pages: pages,
        lastUpdated: item.lastUpdated
      };
    });

    return res.json({
      error: false,
      data: sitemapInfo,
      country: country ? country.toLowerCase() : 'all'
    });
  } catch (error) {
    console.error('❌ Error generating sitemap index:', error);
    return res.status(500).json({ 
      error: true, 
      message: 'Server error',
      data: []
    });
  }
};
