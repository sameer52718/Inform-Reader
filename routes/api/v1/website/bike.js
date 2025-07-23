import { Router } from 'express';
import bikeController from '../../../../controllers/website/bikeController.js';

const router = Router();

// Route for listing software with pagination and filters
router.get('/', bikeController.get);
router.get('/:id', bikeController.detail);

export default router;
