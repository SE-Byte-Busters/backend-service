import express from 'express';
import { handleAdminUploadProfileImage, updateAdminPassword, updateAdminProfile, getPendingReportController } from '../controllers';
import { uploadProfileImage, authenticateToken, partialAccess } from '../middleware';

const router = express.Router();

router.put('/update-profile-image', authenticateToken, uploadProfileImage, handleAdminUploadProfileImage);

router.post('/update-profile', authenticateToken, updateAdminProfile);

router.post('/update-password', authenticateToken, updateAdminPassword);

router.get('/get-pending-reports', authenticateToken, getPendingReportController);

export default router;
