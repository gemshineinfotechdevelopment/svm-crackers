import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';

const router = Router();

router.route('/')
  .get(getSettings)
  .post(updateSettings)
  .put(updateSettings);

export default router;
