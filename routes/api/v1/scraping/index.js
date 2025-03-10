import { Router } from 'express';
import softwareRouter from './software.js';

const router = Router();

router.use('/software', softwareRouter);

export default router;
