import { Router } from 'express';
import BiographyController from '../../../../controllers/website/biographyController.js';

const router = Router();

router.get('/', BiographyController.get);
router.get('/:categoryId', BiographyController.filterByCategory);
router.get('/detail/:biographyId', BiographyController.detail);

export default router;
