import { Router } from 'express';
import BankCodesController from '../../../../controllers/admin/bankCodesController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.get('/',isUser, BankCodesController.get);
router.post('/',isUser, BankCodesController.insert);
router.get('/:id',isUser, BankCodesController.info);
router.put('/:id',isUser, BankCodesController.update);
router.patch('/:id',isUser, BankCodesController.status);
router.delete('/:id',isUser, BankCodesController.delete);


export default router;
