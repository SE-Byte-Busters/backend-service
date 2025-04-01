import express from 'express';
import { signupController, confirmSignUpOTP, sendAgainSignUpOTP } from '../controllers';

const router = express.Router();

router.post('/signup', signupController);
router.put('/confirm-signup', confirmSignUpOTP);
router.put('/send-again-signup', sendAgainSignUpOTP);

export default router;
