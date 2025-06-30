import { Router } from 'express';
import TeamController from '../../../../controllers/website/TeamController.js';

const router = Router();

router.get('/', TeamController.get);
router.get('/:idTeam', TeamController.detail);

export default router;
