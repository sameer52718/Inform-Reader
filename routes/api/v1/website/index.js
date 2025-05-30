import { Router } from 'express';
import bankCodeRouter from './bankCode.js';
import specificationRouter from './specification.js';
import biographyRouter from './biography.js';
import blogRouter from './blog.js';
import couponRouter from './coupon.js';
import nameRouter from './name.js';
import softwareRouter from './software.js';
import postalCodeRouter from './postalCode.js';
import homeRouter from './home.js';
import contactRouter from './contact.js';
import newsLetterRouter from './newsletter.js';
import youtubeRouter from './youtube.js';
import articleRouter from './articleRoute.js';
import currencyRouter from './currency.js';
import metalRouter from './metalRoute.js';
import vehicleRouter from './vehicleRoute.js';

const router = Router();

router.use('/bankCode', bankCodeRouter);
router.use('/specification', specificationRouter);
router.use('/biography', biographyRouter);
router.use('/blog', blogRouter);
router.use('/coupon', couponRouter);
router.use('/name', nameRouter);
router.use('/software', softwareRouter);
router.use('/postalCode', postalCodeRouter);
router.use('/home', homeRouter);
router.use('/contact', contactRouter);
router.use('/newsletter', newsLetterRouter);
router.use('/youtube', youtubeRouter);
router.use('/article', articleRouter);
router.use('/currency', currencyRouter);
router.use('/metal', metalRouter);
router.use('/vehicle', vehicleRouter);

export default router;
