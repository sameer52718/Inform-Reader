import { Router } from 'express';
import commonController from '../../../../controllers/common/commonController.js';

const router = Router();

router.get("/country", commonController.country)
router.get("/type", commonController.type)
router.get("/category", commonController.category)

export default router;
