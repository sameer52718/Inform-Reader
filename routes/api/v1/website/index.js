import { Router } from 'express';
import bankCodeRouter from './bankCode.js';
import specificationRouter from './specification.js';
import biographyRouter from './biography.js';

const router = Router();

router.use('/bankCode', bankCodeRouter);
router.use('/specification', specificationRouter);
router.use('/biography', biographyRouter);

export default router;
