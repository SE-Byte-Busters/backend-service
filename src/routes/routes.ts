import express from 'express';
import auth from './auth.routes';
import userProfile from './userProfile.routes';
import report from './report.routes';
import admin from './admin.routes';
import ticket from './ticket.routes';


const router = express.Router();

router.use('/auth/', auth);
router.use('/user-profile/', userProfile);
router.use('/report/', report);
router.use('/admin/', admin);
router.use('/ticket/', ticket);


export default router;

