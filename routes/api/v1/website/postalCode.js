import { Router } from 'express';
import PostalCodeController from '../../../../controllers/website/postalCodeController.js';

const router = Router();

// Route for listing PostalCode with pagination and filters
router.get('/region', PostalCodeController.getPostalCodesGroupedByRegion);
router.get('/', PostalCodeController.get);
router.get('/state', PostalCodeController.groupByState);
router.get('/area', PostalCodeController.groupByArea);
router.get('/detail', PostalCodeController.getAreaDetail);
router.get('/:id', PostalCodeController.detail);

export default router;
