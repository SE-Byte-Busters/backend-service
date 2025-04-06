import express from 'express';
import { signupController, confirmSignUpOTP, sendAgainSignUpOTP, loginController } from '../controllers';

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: User Signup
 *     description: Registers a new user and sends an OTP for verification.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - phoneNumber
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "user1"
 *                 description: Username showed in program(at least 3 characters)
 *               phoneNumber:
 *                 type: string
 *                 example: "+989123456789"
 *                 description: Must be a valid E.164 formatted phone number (+98 for Iran)
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePassword123"
 *                 description: Password must be at least 8 characters
 *               email:
 *                 type: string
 *                 example: "johndoe@example.com"
 *               firstName:
 *                 type: string
 *                 example: "Ahmadreza"
 *                 description: Optional first name of the user
 *               lastName:
 *                 type: string
 *                 example: "Mohammadi"
 *                 description: Optional last name of the user
 *     responses:
 *       201:
 *         description: Signup successful, OTP sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Signup successful, OTP sent!"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "660b8e5f5a11c3b9d24c52f3"
 *                     otpSentTo:
 *                       type: string
 *                       example: "+989123456789"
 *       400:
 *         description: Validation failed or bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                         example: "phoneNumber"
 *                       message:
 *                         type: string
 *                         example: "Invalid phone number format"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.post('/signup', signupController);

/**
 * @swagger
 * /auth/confirm-signup:
 *   put:
 *     summary: Confirm OTP for user signup
 *     tags: [Auth]
 *     description: Verifies the OTP sent to the user and confirms the signup process.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - code
 *               - _id
 *               - method
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+989123456789"
 *               code:
 *                 type: string
 *                 example: "123456"
 *               _id:
 *                 type: string
 *                 example: "660d9e9b5f1a2b6c8d4f5c7d"
 *               method:
 *                 type: string
 *                 enum: ["phone", "email"]
 *                 example: "phone"
 *     responses:
 *       200:
 *         description: Sign-up confirmed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sign-up confirmed successfully."
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "660d9e9b5f1a2b6c8d4f5c7d"
 *                     username:
 *                       type: string
 *                       example: "johndoe"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+989123456789"
 *       400:
 *         description: Input parameters missing or invalid.
 *       403:
 *         description: User related to OTP not found or maximum attempts reached.
 *       404:
 *         description: OTP not found or expired.
 *       500:
 *         description: Internal server error.
 */
router.put('/confirm-signup', confirmSignUpOTP);

/**
 * @swagger
 * /auth/resend-signup-otp:
 *   put:
 *     summary: Resend OTP for user signup
 *     tags: [Auth]
 *     description: Resends the OTP to the user if the previous OTP has expired or was not received.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - _id
 *               - method
 *             properties:
 *               _id:
 *                 type: string
 *                 example: "660d9e9b5f1a2b6c8d4f5c7d"
 *               method:
 *                 type: string
 *                 enum: ["phone", "email"]
 *                 example: "phone"
 *     responses:
 *       200:
 *         description: OTP code sent again.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP code sent again."
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "660d9e9b5f1a2b6c8d4f5c7d"
 *       400:
 *         description: Input parameters missing or invalid.
 *       403:
 *         description: Maximum OTP resend attempts reached or cooldown period not over.
 *       404:
 *         description: OTP not found or expired.
 *       500:
 *         description: Internal server error.
 */
router.put('/send-again-signup', sendAgainSignUpOTP);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     description: Authenticates a user using either their phone number or email and password, then returns a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: User's phone number or email
 *                 example: "+989123456789"
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: "SecurePassword123"
 *     responses:
 *       201:
 *         description: Login successful.
 *         headers:
 *           x-token:
 *             schema:
 *               type: string
 *             description: JWT authentication token
 *           x-role:
 *             schema:
 *               type: string
 *             description: User role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successfully."
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1..."
 *                     role:
 *                       type: string
 *                       example: "user"
 *       400:
 *         description: Input parameters missing.
 *       401:
 *         description: User not verified.
 *       404:
 *         description: Username (phone or email) or password incorrect.
 *       500:
 *         description: Internal server error.
 */
router.post('/login', loginController);

export default router;
