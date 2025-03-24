import { Router } from 'express';
import CouponController from '../../../../controllers/admin/couponController.js';
import isUser from '../../../../middlewares/isUser.js';
import upload from '../../../../multer.js';
const router = Router();

router.get('/',isUser, CouponController.get);
router.post('/', isUser, upload.any(), CouponController.insert);
router.get('/:id',isUser, CouponController.info);
router.put('/:id',isUser, upload.any(), CouponController.update);
router.patch('/:id',isUser, CouponController.status);
router.delete('/:id',isUser, CouponController.delete);

export default router;
