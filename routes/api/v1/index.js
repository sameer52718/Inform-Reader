import { Router } from 'express';
import scrapingRouter from './scraping/index.js';
import commonRouter from './common/index.js';

const router = Router();

router.use('/scraping', scrapingRouter);
router.use('/common', commonRouter);

export default router;
