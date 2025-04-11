import { Router } from 'express';
import PostalCodeController from '../../../../controllers/website/postalCodeController.js';

const router = Router();

// Route for listing PostalCode with pagination and filters
router.get('/', PostalCodeController.get);
router.get('/:id', PostalCodeController.detail);


export default router;
