import { Router } from 'express';
import { login, getMe, changePassword } from '../controllers/authController';

const router = Router();

router.post('/login', login);
router.get('/me', getMe);
router.post('/change-password', changePassword);

export default router;
