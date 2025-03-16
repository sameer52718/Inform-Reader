import { Router } from 'express';
import bankCodeRouter from './bankCode.js';
import specificationRouter from './specification.js';

const router = Router();

router.use('/bankCode', bankCodeRouter);
router.use('/specification', specificationRouter);

export default router;
