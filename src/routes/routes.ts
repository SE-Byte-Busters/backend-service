import express from 'express';
import auth from './auth.routes';
import userProfile from './userProfile.routes';

const router = express.Router();

router.use('/auth/', auth);
router.use('/user-profile/', userProfile);

export default router;
