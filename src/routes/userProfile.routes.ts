import express from 'express';
import { handleUploadProfileImage, scoreAndRank, updateUserPassword, updateUserProfile } from '../controllers';
import { uploadProfileImage, authenticateToken, partialAccess } from '../middleware';

const router = express.Router();

router.put('/update-profile-image', authenticateToken, uploadProfileImage, handleUploadProfileImage);
router.post('/update-profile', authenticateToken, updateUserProfile);
router.post('/update-password', authenticateToken, updateUserPassword);
router.get('/score-and-rank', authenticateToken, scoreAndRank);

export default router;
