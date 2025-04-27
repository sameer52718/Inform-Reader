import { Router } from 'express';
import YoutubeController from '../../../../controllers/website/youtubeController.js';

const router = Router();

router.get('/', YoutubeController.get);

export default router;
