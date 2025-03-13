import { Router } from 'express';
import bankCodeRouter from './bankCode.js';

const router = Router();

router.use('/bankCode', bankCodeRouter);

export default router;
