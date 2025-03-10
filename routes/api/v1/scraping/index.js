import { Router } from 'express';
import softwareRouter from './software.js';
import bankCodeRouter from './bankCode.js';

const router = Router();

router.use('/software', softwareRouter);
router.use('/bankCode', bankCodeRouter);

export default router;
