import { Router } from 'express';
import scrapingRouter from './scraping/index.js';
import commonRouter from './common/index.js';
import websiteRouter from './website/index.js';
import adminRouter from './admin/index.js';
import userRouter from './user/index.js';
import storeTraffic from '../../../middlewares/storeTraffic.js';

const router = Router();

router.use('/scraping', scrapingRouter);
router.use('/common', commonRouter);
router.use('/website', storeTraffic, websiteRouter);
router.use('/admin', adminRouter);
router.use('/user', userRouter);

export default router;
