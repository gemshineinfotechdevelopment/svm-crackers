import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  clearAllCategories,
} from '../controllers/categoryController';

const router = Router();

router.route('/clear/all').delete(clearAllCategories);
router.route('/').get(getCategories).post(createCategory);
router.route('/:id').get(getCategoryById).put(updateCategory).delete(deleteCategory);

export default router;
