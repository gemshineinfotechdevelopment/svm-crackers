import { Router } from 'express';
import {
  getChitDashboard,
  createChitCustomer,
  getAllChitCustomers,
  getChitCustomerById,
  updateChitCustomer,
  allocateChitScheme,
  getCustomerAllocations,
  updateAllocationStatus,
  getChitCollectionsOverview,
  getCustomerCollectionDetails,
  recordChitPayment,
  getCustomerPaymentHistory,
  getChitReceipt,
  createChitScheme,
  getAllChitSchemes,
  getChitSchemeById,
  updateChitScheme,
  deleteChitScheme,
} from '../controllers/chitController';

const router = Router();

// Dashboard
router.get('/dashboard', getChitDashboard);

// Schemes Master
router.route('/schemes').get(getAllChitSchemes).post(createChitScheme);
router.route('/schemes/:id').get(getChitSchemeById).put(updateChitScheme).delete(deleteChitScheme);

// Customers
router.route('/customers').get(getAllChitCustomers).post(createChitCustomer);
router.route('/customers/:id').get(getChitCustomerById).put(updateChitCustomer);

// Scheme Allocations
router.post('/allocations', allocateChitScheme);
router.get('/allocations/customer/:customerId', getCustomerAllocations);
router.put('/allocations/:allocationId/status', updateAllocationStatus);

// Collections & Month-wise Installments
router.get('/collections', getChitCollectionsOverview);
router.get('/collections/:customerId', getCustomerCollectionDetails);

// Payments & Receipts
router.post('/payments', recordChitPayment);
router.get('/payments/customer/:customerId', getCustomerPaymentHistory);
router.get('/receipts/:receiptNumber', getChitReceipt);

export default router;
