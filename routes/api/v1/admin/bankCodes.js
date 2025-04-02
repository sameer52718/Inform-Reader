import { Router } from 'express';
import PostalCodesController from '../../../../controllers/admin/postalCodeController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.get('/',isUser, PostalCodesController.get);
router.post('/',isUser, PostalCodesController.insert);
router.get('/:id',isUser, PostalCodesController.info);
router.put('/:id',isUser, PostalCodesController.update);
router.patch('/:id',isUser, PostalCodesController.status);
router.delete('/:id',isUser, PostalCodesController.delete);


export default router;
