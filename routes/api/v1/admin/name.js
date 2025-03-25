import { Router } from 'express';
import NameController from '../../../../controllers/admin/nameController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.get('/',isUser, NameController.get);
router.post('/',isUser, NameController.insert);
router.get('/:id',isUser, NameController.info);
router.put('/:id',isUser, NameController.update);
router.patch('/:id',isUser, NameController.status);
router.delete('/:id',isUser, NameController.delete);

export default router;
