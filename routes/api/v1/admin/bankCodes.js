import { Router } from 'express';
import bankCodesController from '../../../../controllers/admin/bankCodesController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.get('/', isUser, bankCodesController.get);
router.post('/', isUser, bankCodesController.insert);
router.get('/:id', isUser, bankCodesController.info);
router.put('/:id', isUser, bankCodesController.update);
router.patch('/:id', isUser, bankCodesController.status);
router.delete('/:id', isUser, bankCodesController.delete);

export default router;
