import { Router } from 'express';
import CouponController from '../../../../controllers/website/couponController.js';

const router = Router();

router.get('/', CouponController.get);
router.get('/filter', CouponController.filter);
router.get('/:couponId', CouponController.detail);

router.get('/offer/filter', CouponController.offerFilter);
router.get('/offer/detail/:offerId', CouponController.offerDetail);

export default router;
