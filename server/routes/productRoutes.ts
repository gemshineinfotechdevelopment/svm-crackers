import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  bulkImportProducts,
} from '../controllers/productController';

const router = Router();

router.route('/').get(getProducts).post(createProduct);
router.route('/bulk-import').post(bulkImportProducts);
router.route('/bulk').post(bulkImportProducts).delete(bulkDeleteProducts);
router.route('/bulk-delete').post(bulkDeleteProducts);
router.route('/:id').get(getProductById).put(updateProduct).delete(deleteProduct);

export default router;

