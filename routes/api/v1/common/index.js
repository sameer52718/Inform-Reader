import { Router } from 'express';
import commonController from '../../../../controllers/common/commonController.js';

const router = Router();

router.get("/country", commonController.country)


export default router;
