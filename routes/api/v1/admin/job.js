import { Router } from 'express';
import JobController from '../../../../controllers/admin/jobController.js';
import isUser from '../../../../middlewares/isUser.js';
import upload from '../../../../multer.js';
const router = Router();

router.get('/',isUser, JobController.get);
router.post('/', isUser, upload.any(), JobController.insert);
router.get('/:id',isUser, JobController.info);
router.put('/:id',isUser, upload.any(), JobController.update);
router.patch('/:id',isUser, JobController.status);
router.delete('/:id',isUser, JobController.delete);

export default router;
