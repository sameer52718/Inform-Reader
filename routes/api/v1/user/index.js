import { Router } from 'express';
import authRouter from './auth.js';
import profileRouter from './profile.js';
import blogRouter from './blog.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/blog', blogRouter);

export default router;
