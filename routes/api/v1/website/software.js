import { Router } from 'express';
import SoftwareController from '../../../../controllers/website/softwareController.js';

const router = Router();

// Route for listing software with pagination and filters
router.get('/', SoftwareController.get);
router.get('/random', SoftwareController.getRandom);
router.get('/:id', SoftwareController.detail);

export default router;
