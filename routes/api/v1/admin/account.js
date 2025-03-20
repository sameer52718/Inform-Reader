import { Router } from 'express';
import accountController from '../../../../controllers/admin/accountController.js';
import upload from '../../../../multer.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.use(isUser);

router.post('/', accountController.insert);
router.get('/', accountController.get);
router.patch('/:id', accountController.status);
router.delete('/:id', accountController.delete);


export default router;
