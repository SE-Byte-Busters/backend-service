import express from 'express';
import { signupController, confirmSignUpOTP } from '../controllers';

const router = express.Router();

router.post('/signup', signupController);
router.post('/confirm-signup', confirmSignUpOTP);

export default router;
