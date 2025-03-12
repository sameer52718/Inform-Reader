import { Router } from 'express';
import softwareRouter from './software.js';
import bankCodeRouter from './bankCode.js';
import mobileRouter from './mobile.js';

const router = Router();

router.use('/software', softwareRouter);
router.use('/mobile', mobileRouter);
router.use('/bankCode', bankCodeRouter);

export default router;
