import { Router } from 'express';
import SpecificationController from '../../../../controllers/scraping/specificationController.js';

const router = Router();

router.post('/web-camera', SpecificationController.webCamera);
router.post('/water-dispenser', SpecificationController.waterDispenser);
router.post('/washing-machine', SpecificationController.washingMachine);
router.post('/vaccum-cleaner', SpecificationController.vaccumCleaner);
router.post('/tripod', SpecificationController.tripod);
router.post('/toners', SpecificationController.toners);
router.post('/tablet', SpecificationController.tablet);
router.post('/tablet-other-accessories', SpecificationController.tabletOtherAccessories);
router.post('/universal', SpecificationController.universal);

export default router;
