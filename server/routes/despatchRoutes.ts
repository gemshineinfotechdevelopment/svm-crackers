import { Router } from 'express';
import {
  getDespatches,
  getDespatchById,
  createDespatch,
  updateDespatch,
  deleteDespatch,
  getNextSNo,
  syncFromBills,
} from '../controllers/despatchController';

const router = Router();

router.get('/next-sno', getNextSNo);
router.post('/sync-bills', syncFromBills);

router.get('/', getDespatches);
router.get('/:id', getDespatchById);
router.post('/', createDespatch);
router.put('/:id', updateDespatch);
router.delete('/:id', deleteDespatch);

export default router;
