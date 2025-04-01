import express from 'express';
import { signupController, confirmSignUpOTP, sendAgainSignUpOTP, loginController } from '../controllers';

const router = express.Router();

router.post('/signup', signupController);
router.put('/confirm-signup', confirmSignUpOTP);
router.put('/send-again-signup', sendAgainSignUpOTP);
router.post('/login', loginController);

export default router;
