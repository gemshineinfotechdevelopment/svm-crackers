import { Router } from 'express';
import {
  getPriceList,
  createPriceListItem,
  bulkImportPriceList,
  updatePriceListItem,
  deletePriceListItem,
  deletePriceListBatch,
  clearAllPriceList,
} from '../controllers/priceListController';

const router = Router();

router.route('/').get(getPriceList).post(createPriceListItem);
router.post('/bulk', bulkImportPriceList);
router.delete('/batch/:batchName', deletePriceListBatch);
router.delete('/clear/all', clearAllPriceList);
router.route('/:id').put(updatePriceListItem).delete(deletePriceListItem);

export default router;
