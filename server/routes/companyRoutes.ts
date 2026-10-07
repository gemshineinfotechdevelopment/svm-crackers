import { Router } from 'express';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../controllers/companyController';

const router = Router();

router.route('/').get(getCompanies).post(createCompany);
router.route('/:id').get(getCompanyById).put(updateCompany).delete(deleteCompany);

export default router;
