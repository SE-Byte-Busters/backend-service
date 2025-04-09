import express from 'express';
import { handleUploadProfileImage } from '../controllers';
import { uploadProfileImage, authenticateToken, partialAccess } from '../middleware';

const router = express.Router();

router.put('/update-profile-image', authenticateToken, uploadProfileImage, handleUploadProfileImage);

export default router;