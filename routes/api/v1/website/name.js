import { Router } from 'express';
import namesController from '../../../../controllers/website/namesController.js';

const router = Router();

// Route for listing names with pagination and filters
router.get('/', namesController.getNamesList);

// Route for getting name details by ID
router.get('/:nameId', namesController.getNameDetail);

export default router;
