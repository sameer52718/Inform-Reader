import { Router } from 'express';
import PostalCodeController from '../../../../controllers/admin/postalCodeController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();
[]
router.get('/',isUser, PostalCodeController.get);
router.post('/',isUser, PostalCodeController.insert);
router.get('/:id',isUser, PostalCodeController.info);
router.put('/:id',isUser, PostalCodeController.update);
router.patch('/:id',isUser, PostalCodeController.status);
router.delete('/:id',isUser, PostalCodeController.delete);


export default router;
