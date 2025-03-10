import { Router } from 'express';
import SoftwareController from '../../../../controllers/scraping/softwareController.js';
// import isUser from '../../../../middlewares/isUser.js';

const router = Router();

router.post('/', SoftwareController.insert);


export default router;
