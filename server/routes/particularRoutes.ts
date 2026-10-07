import { Router } from 'express';
import {
  getParticulars,
  getParticularById,
  getNextBillNo,
  createParticular,
  updateParticular,
  deleteParticular,
  uploadParticularPdf,
  deleteParticularPdf,
} from '../controllers/particularController';

const router = Router();

// Base collection routes
router.route('/').get(getParticulars).post(createParticular);

// Specific named routes (placed before generic :id)
router.route('/next-bill-no').get(getNextBillNo);
router.route('/:id/pdf').post(uploadParticularPdf).delete(deleteParticularPdf);

// Generic ID routes
router.route('/:id').get(getParticularById).put(updateParticular).delete(deleteParticular);

export default router;
