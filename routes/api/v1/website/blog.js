import { Router } from 'express';
import BlogController from '../../../../controllers/website/blogController.js';

const router = Router();

router.get('/', BlogController.get);
router.get('/:categoryId', BlogController.filterByCategory);
router.get('/:categoryId/:blogId', BlogController.detail);

export default router;
