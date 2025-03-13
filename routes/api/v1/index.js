import { Router } from 'express';
import scrapingRouter from './scraping/index.js';
import commonRouter from './common/index.js';
import websiteRouter from './website/index.js';

const router = Router();

router.use('/scraping', scrapingRouter);
router.use('/common', commonRouter);
router.use('/website', websiteRouter);

export default router;
