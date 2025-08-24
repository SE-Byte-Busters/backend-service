import express from 'express';
import { getTopUsersController, handleUploadProfileImage, scoreAndRank, updateUserPassword, updateUserProfile, userProfile } from '../controllers';
import { uploadProfileImage, authenticateToken, partialAccess } from '../middleware';

const router = express.Router();

/**
 * @swagger
 * /user-profile/:
 *   get:
 *     summary: Get user profile by ID
 *     description: Returns the profile of the authenticated user.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User Profile."
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Forbidden (invalid/missing user ID or token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error."
 */
router.get("/", authenticateToken, userProfile);

/**
 * @swagger
 * /user-profile/update-profile-image:
 *   put:
 *     summary: Update user profile image
 *     description: |
 *       Uploads a new profile image for the authenticated user.
 *       - Replaces existing profile image if one exists
 *       - Accepts JPEG, PNG, GIF, WEBP images (max 4MB)
 *       - Returns new profile URL
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload as profile picture
 *     responses:
 *       200:
 *         description: Profile image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile image uploaded successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     profileUrl:
 *                       type: string
 *                       example: https://storage.example.com/profile-bucket/profiles/abc123.jpg
 *         headers:
 *           x-new-token:
 *             schema:
 *               type: string
 *             description: New JWT token if current one was near expiration
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (invalid permissions or user not found)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       413:
 *         description: Payload too large (image exceeds 4MB limit)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Error message describing what went wrong
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   parameters:
 *     profileImageParam:
 *       in: formData
 *       name: profileImage
 *       type: file
 *       description: The profile image to upload
 *       required: true
 */
router.put('/update-profile-image', authenticateToken, uploadProfileImage, handleUploadProfileImage);

/**
 * @swagger
 * /user-profile/update-profile:
 *   post:
 *     summary: Update user profile information
 *     description: |
 *       Updates basic user profile information including:
 *       - First name
 *       - Last name
 *       - Username
 *       - Email
 *       
 *       Note: Changing username updates associated scoreboard entries
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *                 minLength: 2
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 example: Doe
 *                 minLength: 2
 *                 maxLength: 50
 *               username:
 *                 type: string
 *                 example: johndoe123
 *                 minLength: 3
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *             example:
 *               firstName: John
 *               lastName: Doe
 *               username: johndoe123
 *               email: john.doe@example.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *         headers:
 *           x-new-token:
 *             schema:
 *               type: string
 *             description: New JWT token if current one was near expiration
 *       400:
 *         description: Bad request (validation errors)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (invalid permissions)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict (email/username already taken)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Error message describing what went wrong
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
router.post('/update-profile', authenticateToken, updateUserProfile);

/**
 * @swagger
 * /user-profile/update-password:
 *   post:
 *     summary: Update user password
 *     description: |
 *       Updates the authenticated user's password after verifying the old password.
 *       - Requires valid current password
 *       - New password will be hashed before storage
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 format: password
 *                 description: Current password for verification
 *                 minLength: 8
 *                 maxLength: 100
 *                 example: "currentSecurePassword123!"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password to set
 *                 minLength: 8
 *                 maxLength: 100
 *                 example: "newSecurePassword456!"
 *             example:
 *               oldPassword: "currentSecurePassword123!"
 *               newPassword: "newSecurePassword456!"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password updated successfully.
 *         headers:
 *           x-new-token:
 *             schema:
 *               type: string
 *             description: New JWT token if current one was near expiration
 *       400:
 *         description: Bad request (missing/invalid fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized (invalid current password or token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (invalid permissions)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Error message describing what went wrong
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
router.post('/update-password', authenticateToken, updateUserPassword);

/**
 * @swagger
 * /user-profile/score-and-rank:
 *   get:
 *     summary: Get user's score and global rank
 *     description: |
 *       Retrieves the authenticated user's current score and global ranking.
 *       - Rank is calculated based on users with higher scores
 *       - Returns username along with score/rank data
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved score and rank
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User Score and Rank.
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     score:
 *                       type: number
 *                       example: 1500
 *                     rank:
 *                       type: number
 *                       description: 1-based global ranking
 *                       example: 42
 *                     username:
 *                       type: string
 *                       example: john_doe
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (invalid permissions)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User score data not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Error message describing what went wrong
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
router.get('/score-and-rank', authenticateToken, scoreAndRank);


/**
 * @swagger
 * /user-profile/top:
 *   get:
 *     summary: Get top N users by totalScore
 *     tags:
 *       - User
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top users to return ,use like /user/top?limit=3
 *     responses:
 *       200:
 *         description: List of top users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid query parameter
 */
router.get('/top', authenticateToken, getTopUsersController);

export default router;
