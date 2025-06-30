import { Router } from 'express';
import PlayerController from '../../../../controllers/website/PlayerController.js';

const router = Router();

router.get('/', PlayerController.get);
router.get('/:idPlayer', PlayerController.detail);

export default router;
