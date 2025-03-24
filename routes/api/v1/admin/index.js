import { Router } from 'express';
import authRouter from './auth.js';
import accountRouter from './account.js';
import profileRouter from './profile.js';
import categoryRouter from './category.js';
import subCategoryRouter from './subCategory.js';
import brandRouter from './brand.js';
import specificationRouter from './specification.js';
import couponRouter from './coupon.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/account', accountRouter);
router.use('/profile', profileRouter);
router.use('/category', categoryRouter);
router.use('/subCategory', subCategoryRouter);
router.use('/brand', brandRouter);
router.use('/specification', specificationRouter);
router.use('/coupon', couponRouter);

export default router;
