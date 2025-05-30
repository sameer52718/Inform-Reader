import { Router } from 'express';
import vehicleController from '../../../../controllers/website/vehicleController.js';

const router = Router();

// Route for listing software with pagination and filters
router.get('/', vehicleController.get);
router.get('/:id', vehicleController.detail);

export default router;
