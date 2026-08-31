import { Router } from 'express';
import { dispatchHeresnowAttendance } from '../controllers/heresnowIntegrationController';

const router = Router();

/** HeresNow → Hyvision One Push (Webhook) */
router.post('/hvo/dispatch', dispatchHeresnowAttendance);

export default router;
