import { google } from 'googleapis';
import logger from '../logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const submitSitemap = async () => {
  try {
    logger.info('Submitting sitemap to Google Search Console');

    const auth = new google.auth.JWT({
      keyFile: path.join(__dirname, '../sitemap-key.json'),
      scopes: ['https://www.googleapis.com/auth/webmasters'],
    });
    await auth.authorize();
    const webmasters = google.webmasters({ version: 'v3', auth });
    const response = await webmasters.sitemaps.submit({
      siteUrl: 'sc-domain:informreaders.com',
      feedpath: 'https://informreaders.com/sitemap.xml',
    });
    logger.info('Sitemap submitted successfully', response.data);
  } catch (error) {
    console.error(error);
  }
}