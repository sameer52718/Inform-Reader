import { Router } from 'express';
import MakeController from '../../../../controllers/admin/makeController.js';
import isUser from '../../../../middlewares/isUser.js';
import upload from '../../../../multer.js';
const router = Router();

router.get('/',isUser, MakeController.get);
router.post('/', isUser, upload.any(), MakeController.insert);
router.get('/:id',isUser, MakeController.info);
router.put('/:id', isUser, upload.any(), MakeController.update);
router.patch('/:id', isUser, MakeController.status);
router.delete('/:id',isUser, MakeController.delete);


export default router;
