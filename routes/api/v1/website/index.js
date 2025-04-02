import { Router } from 'express';
import bankCodeRouter from './bankCode.js';
import specificationRouter from './specification.js';
import biographyRouter from './biography.js';
import blogRouter from './blog.js';
import couponRouter from './coupon.js';

const router = Router();

router.use('/bankCode', bankCodeRouter);
router.use('/specification', specificationRouter);
router.use('/biography', biographyRouter);
router.use('/blog', blogRouter);
router.use('/coupon', couponRouter);

export default router;
