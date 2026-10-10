import { Router } from 'express';
import {
  getPriceMaps,
  createPriceMap,
  updatePriceMap,
  deletePriceMap,
  batchSavePriceMaps,
} from '../controllers/priceMapController';

const router = Router();

router.route('/').get(getPriceMaps).post(createPriceMap);
router.post('/batch-save', batchSavePriceMaps);
router.route('/:id').put(updatePriceMap).delete(deletePriceMap);

export default router;
