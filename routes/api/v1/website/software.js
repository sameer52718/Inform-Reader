import { Router } from 'express';
import softwareController from '../../../../controllers/website/softwareController.js';

const router = Router();

// Route for listing software with pagination and filters
router.get('/', softwareController.get);
router.get('/:id', softwareController.detail);

// Route for getting name details by ID
// router.get('/:nameId', softwareController.getNameDetail);

export default router;
