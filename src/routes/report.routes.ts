import express from 'express';
import { reportUpload, authenticateToken, partialAccess } from '../middleware';
import { createReportController, getUserReportsController } from '../controllers';

const router = express.Router();

router.post('/create-report', authenticateToken, reportUpload, createReportController);
router.get('/reports', authenticateToken, getUserReportsController);

export default router;
