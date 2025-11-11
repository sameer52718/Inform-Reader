import { Router } from 'express';
import BankCodeController from '../../../../controllers/website/bankCodeController.js';

const router = Router();

router.get('/', BankCodeController.get);
router.get('/:countryCode/:bankSlug/:branchSlug', BankCodeController.branchDetail);
router.get('/banks', BankCodeController.groupByBank);
router.get('/branches', BankCodeController.groupByBranch);
router.get('/:swiftCode', BankCodeController.detail);

export default router;
