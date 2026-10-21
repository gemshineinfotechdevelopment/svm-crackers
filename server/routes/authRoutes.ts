import { Router } from 'express';
import { login, getMe, getAllAdmins, changePassword } from '../controllers/authController';

const router = Router();

router.post('/login', login);
router.get('/me', getMe);
router.get('/users', getAllAdmins);
router.post('/change-password', changePassword);

export default router;
