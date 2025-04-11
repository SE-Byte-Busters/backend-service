import express from 'express';
import auth from './auth.routes';
import userProfile from './userProfile.routes';
import report from './report.routes';

const router = express.Router();

router.use('/auth/', auth);
router.use('/user-profile/', userProfile);
router.use('/report/', report);

export default router;
