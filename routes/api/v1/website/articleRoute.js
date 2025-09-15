import { Router } from 'express';
import ArticleController from '../../../../controllers/website/ArticleController.js';

const router = Router();

router.get('/', ArticleController.getByCountry);
router.get('/:id', ArticleController.getInfo);

export default router;
