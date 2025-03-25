import { Router } from 'express';
import commonController from '../../../../controllers/common/commonController.js';

const router = Router();

router.get("/country", commonController.country)
router.get("/type", commonController.type)
router.get("/category", commonController.category)
router.get("/subCategory", commonController.subCategory)
router.get("/brand", commonController.brand)
router.get("/religion", commonController.religion)


export default router;
