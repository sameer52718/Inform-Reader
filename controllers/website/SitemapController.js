import Sitemap from '../../models/Sitemap.js';

export const getSitemap = async (req, res) => {
  try {
    const { filename } = req.params;
    const sitemap = await Sitemap.findOne({ fileName: filename });

    if (!sitemap) {
      return res.status(404).send('Sitemap not found');
    }

    res.set('Content-Type', 'application/xml');
    return res.send(sitemap.xmlContent);
  } catch (err) {
    console.error('❌ Error fetching sitemap:', err);
    res.status(500).send('Server error');
  }
};

export const getSitemapByCountry = async (req, res) => {
  try {
    const { host } = req.query;

    let subdomainCountryCode = 'pk';
    try {
      const hostname = new URL(`https://${host}`).hostname;
      const parts = hostname.split('.');
      if (parts.length > 2) {
        subdomainCountryCode = parts[0].toUpperCase(); // e.g., "PK"
      }
    } catch {}

    const sitemaps = await Sitemap.find({ country: subdomainCountryCode.toLowerCase() }).select('fileName updatedAt');
    return res.json({ error: false, data: sitemaps });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};
