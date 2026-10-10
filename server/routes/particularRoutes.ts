import { Router } from 'express';
import {
  getParticulars,
  getParticularById,
  getNextBillNo,
  getCustomerBillingHistory,
  createParticular,
  updateParticular,
  deleteParticular,
  uploadParticularPdf,
  deleteParticularPdf,
  convertQuotationToBill,
  bulkDuplicateParticulars,
} from '../controllers/particularController';

const router = Router();

// Base collection routes
router.route('/').get(getParticulars).post(createParticular);

// Specific named routes (placed before generic :id)
router.route('/bulk-duplicate').post(bulkDuplicateParticulars);
router.route('/next-bill-no').get(getNextBillNo);
router.route('/customer-history').get(getCustomerBillingHistory);
router.route('/customer/:customerName/history').get(getCustomerBillingHistory);
router.route('/:id/pdf').post(uploadParticularPdf).delete(deleteParticularPdf);
router.route('/:id/convert-to-bill').post(convertQuotationToBill);

// Generic ID routes
router.route('/:id').get(getParticularById).put(updateParticular).delete(deleteParticular);

export default router;
