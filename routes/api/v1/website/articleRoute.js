import { Router } from 'express';
import ArticleController from '../../../../controllers/website/ArticleController.js';

const router = Router();

router.get('/', ArticleController.getByCountry);

export default router;
