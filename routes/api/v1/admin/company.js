import { Router } from 'express';
import CompanyController from '../../../../controllers/admin/companyController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.get('/',isUser, CompanyController.get);
router.post('/',isUser, CompanyController.insert);
router.get('/:id',isUser, CompanyController.info);
router.put('/:id',isUser, CompanyController.update);
router.patch('/:id',isUser, CompanyController.status);
router.delete('/:id',isUser, CompanyController.delete);


export default router;
