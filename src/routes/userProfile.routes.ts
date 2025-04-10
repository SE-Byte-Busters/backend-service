import express from 'express';
import { handleUploadProfileImage, updateUserPassword, updateUserProfile } from '../controllers';
import { uploadProfileImage, authenticateToken, partialAccess } from '../middleware';

const router = express.Router();

router.put('/update-profile-image', authenticateToken, uploadProfileImage, handleUploadProfileImage);
router.post('/update-profile', authenticateToken, updateUserProfile);
router.post('/update-password', authenticateToken, updateUserPassword);

export default router;
