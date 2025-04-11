import { Router } from 'express';
import ModelController from '../../../../controllers/admin/modelController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.get('/',isUser, ModelController.get);
router.post('/',isUser, ModelController.insert);
router.get('/:id',isUser, ModelController.info);
router.put('/:id',isUser, ModelController.update);
router.patch('/:id',isUser, ModelController.status);
router.delete('/:id',isUser, ModelController.delete);


export default router;
