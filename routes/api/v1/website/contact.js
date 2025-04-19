import { Router } from 'express';
import ContactController from '../../../../controllers/website/contactController.js';

const router = Router();

router.post('/', ContactController.insert);

export default router;
