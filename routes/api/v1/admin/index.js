import { Router } from 'express';
import authRouter from './auth.js';
import accountRouter from './account.js';
import profileRouter from './profile.js';
import categoryRouter from './category.js';
import subCategoryRouter from './subCategory.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/account', accountRouter);
router.use('/profile', profileRouter);
router.use('/category', categoryRouter);
router.use('/subCategory', subCategoryRouter);

export default router;
