import { Router } from 'express';
import HomeController from '../../../../controllers/website/homeController.js';

const router = Router();

router.get('/', HomeController.get);

export default router;
