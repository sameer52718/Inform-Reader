import { Router } from 'express';
import LeagueController from '../../../../controllers/website/LeagueController.js';

const router = Router();

router.get('/', LeagueController.get);
router.get('/country', LeagueController.getCountries);
router.get('/:idLeague', LeagueController.detail);

export default router;
