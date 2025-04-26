import express from 'express';
import { handleAdminUploadProfileImage, updateAdminPassword, updateAdminProfile, getPendingReportController } from '../controllers';
import { uploadProfileImage, authenticateToken, partialAccess } from '../middleware';

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin operations
 */
const router = express.Router();

/**
 * @swagger
 * /admin/update-profile-image:
 *   put:
 *     summary: Update admin profile image
 *     description: |
 *       Uploads a new profile image for the authenticated admin.
 *       - Replaces existing profile image if one exists
 *       - Accepts JPEG, PNG, GIF, WEBP images (max 4MB)
 *       - Returns new profile URL
 *     tags: [Admin]
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
 *         description: Forbidden (invalid permissions or admin not found)
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
router.put('/update-profile-image', authenticateToken, uploadProfileImage, handleAdminUploadProfileImage);

/**
 * @swagger
 * /admin/update-profile:
 *   post:
 *     summary: Update admin profile information
 *     description: |
 *       Updates basic admin profile information including:
 *       - First name
 *       - Last name
 *       - Username
 *       - Email
 *       
 *       Note: Changing username updates associated scoreboard entries
 *     tags: [Admin]
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
router.post('/update-profile', authenticateToken, updateAdminProfile);

/**
 * @swagger
 * /admin/update-password:
 *   post:
 *     summary: Update admin password
 *     description: |
 *       Updates the authenticated admin's password after verifying the old password.
 *       - Requires valid current password
 *       - New password will be hashed before storage
 *     tags: [Admin]
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
router.post('/update-password', authenticateToken, updateAdminPassword);

/**
 * @swagger
 * /admin/get-pending-reports:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get pending reports awaiting approval
 *     description: Retrieve a paginated list of reports with approvalStatus=0 (pending approval)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: The page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page (max 100)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [oldest, newest]
 *           default: oldest
 *         description: Sort order - 'oldest' or 'newest'
 *     responses:
 *       200:
 *         description: Successfully retrieved pending reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pending reports retrieved successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     reports:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Report'
 *                     total:
 *                       type: integer
 *                       example: 42
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pages:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - user ID missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/get-pending-reports', authenticateToken, getPendingReportController);

/**
 * @swagger
 * components:
 *  schemas:
 *    Report:
 *      type: object
 *      properties:
 *        user:
 *          type: string
 *          description: ID of the user who created the report
 *        title:
 *          type: string
 *        description:
 *          type: string
 *        # ... other report properties from your interface
 *    ErrorResponse:
 *      type: object
 *      properties:
 *        message:
 *          type: string
 *  securitySchemes:
 *    bearerAuth:
 *      type: http
 *      scheme: bearer
 *      bearerFormat: JWT
 */


export default router;
