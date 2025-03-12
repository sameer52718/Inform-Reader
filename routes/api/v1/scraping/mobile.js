import { Router } from 'express';
import MobileController from '../../../../controllers/scraping/mobileController.js';
// import isUser from '../../../../middlewares/isUser.js';

const router = Router();

router.post('/', MobileController.insert);


export default router;
