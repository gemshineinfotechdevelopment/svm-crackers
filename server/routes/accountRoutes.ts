import { Router } from 'express';
import {
  getAccountDetails,
  addCredit,
  deleteAccountEntry,
} from '../controllers/accountController';

const router = Router();

router.route('/').get(getAccountDetails);
router.route('/credit').post(addCredit);
router.route('/:id').delete(deleteAccountEntry);

export default router;
