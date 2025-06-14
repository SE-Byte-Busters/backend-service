import express from 'express';
import { handleAdminUploadProfileImage, updateAdminPassword, updateAdminProfile, getPendingReportController, getStatedReportController, updateReportStatusController, getReportByIdController, addScoreToReportController, userAdminProfileController, addBadgeController } from '../controllers';
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
 * /admin/profile:
 *   get:
 *     summary: Get current user's profile
 *     description: >
 *       Returns the authenticated user's profile information.  
 *       Requires a valid Bearer token in the Authorization header.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returned user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized – Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 */

router.get('/profile', authenticateToken, userAdminProfileController);



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
 * /admin/get-stated-reports:
 *   get:
 *     summary: Get reports with specific statuses (admin only)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieves a paginated and optionally sorted list of reports with specific statuses.
 *       Only accessible by admin users.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *         required: false
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 10
 *         required: false
 *         description: Number of reports per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: createdAt
 *         required: false
 *         description: Field to sort the results by (e.g., createdAt, priority, etc.)
 *     responses:
 *       200:
 *         description: Successfully retrieved the reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reports:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *                 totalReports:
 *                   type: integer
 *                   example: 42
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - User is not admin
 *       500:
 *         description: Server error
 */
router.get('/get-stated-reports', authenticateToken, getStatedReportController);


/**
 * @swagger
 * /admin/reports/{reportId}:
 *   put:
 *     summary: Update the priority and approval status of a report
 *     description: Updates the priority and approval status of a specific report.
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         description: The ID of the report to update
 *         schema:
 *           type: string
 *       - in: body
 *         name: report
 *         description: The priority and approval status to update the report with
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             priority:
 *               type: string
 *               enum: [High, Medium, Low]
 *               description: The priority of the report
 *             approvalStatus:
 *               type: integer
 *               enum: [0, 1, 2]
 *               description: The approval status of the report (0=Pending, 1=Approved, 2=Rejected)
 *     responses:
 *       200:
 *         description: Successfully updated the report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 reportId:
 *                   type: string
 *                 priority:
 *                   type: string
 *                 approvalStatus:
 *                   type: integer
 *       400:
 *         description: Invalid request, bad parameters or missing fields
 *       500:
 *         description: Internal server error
 */
router.put('/reports/:reportId/', authenticateToken, updateReportStatusController);



/**
 * @swagger
 * /admin/reports/{reportId}/:
 *   get:
 *     summary: Get a report by its ID
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *           format: ObjectId
 *         description: The ID of the report to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved the report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       format: ObjectId
 *                       example: "67f924e2cbf331ebfcbe5f7e"
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           format: ObjectId
 *                           example: "67eba729af9ae825bcfcd935"
 *                         username:
 *                           type: string
 *                           example: "testuser1"
 *                     title:
 *                       type: string
 *                       example: "Pothole on Main Street"
 *                     description:
 *                       type: string
 *                       example: "Large pothole causing traffic issues"
 *                     approximatePosition:
 *                       type: string
 *                       example: "Near Main St and 5th Ave"
 *                     location:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           example: "Point"
 *                         coordinates:
 *                           type: array
 *                           items:
 *                             type: number
 *                           example: [-73.987654, 40.748817]
 *                     city:
 *                       type: string
 *                       example: "New York"
 *                     category:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Infrastructure"]
 *                     priority:
 *                       type: string
 *                       example: "High"
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           key:
 *                             type: string
 *                             format: uri
 *                             example: "https://example.com/image1.png"
 *                           url:
 *                             type: string
 *                             example: "reports/image1.png"
 *                           _id:
 *                             type: string
 *                             format: ObjectId
 *                     completionStatus:
 *                       type: integer
 *                       example: 0
 *                     approvalStatus:
 *                       type: integer
 *                       example: 0
 *                     status:
 *                       type: integer
 *                       example: 0
 *                     voteScore:
 *                       type: integer
 *                       example: 0
 *                     votes:
 *                       type: array
 *                       items:
 *                         type: object
 *                     comments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Comment'
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-04-11T14:19:14.468Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-05-11T06:20:20.840Z"
 *                     usersReqSolve:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           user:
 *                             type: string
 *                             format: ObjectId
 *                           text:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           _id:
 *                             type: string
 *                             format: ObjectId
 *                     resolvedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-05-10T17:53:23.336Z"
 *                     resolvedBy:
 *                       type: string
 *                       format: ObjectId
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
router.get('/reports/:reportId/', authenticateToken, getReportByIdController);


/**
 * @swagger
 * /admin/reports/{reportId}/score:
 *   put:
 *     summary: Admin adds or updates a score for a report
 *     description: >
 *       Use this endpoint to assign a score between 0 and 100 to a specific report.
 *       The score will be counted toward the user's total score.
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the report you want to score
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - score
 *             properties:
 *               score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 75
 *                 description: The score to assign to the report (must be between 0 and 100)
 *     responses:
 *       200:
 *         description: Score successfully added to the report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Score updated successfully
 *                 report:
 *                   type: object
 *                   description: The updated report object
 *       400:
 *         description: Invalid input (e.g., score out of range or report not found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Score must be a number between 0 and 100
 */

router.put('/reports/:reportId/score', addScoreToReportController);


/**
 * @swagger
 * /admin/user-profile/{id}/badges:
 *   post:
 *     summary: Add a badge to a user
 *     description: Adds a new badge (if not already present) to the user's badge list.
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - badge
 *             properties:
 *               badge:
 *                 type: string
 *                 example: قهرمان محیط زیست
 *     responses:
 *       200:
 *         description: Badge added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 badges:
 *                   type: array
 *                   items:
 *                     type: string
 *             example:
 *               badges: 
 *                 - "قهرمان محیط زیست"
 *       400:
 *         description: Badge is required
 *         content:
 *           application/json:
 *             example:
 *               message: "Badge is required"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             example:
 *               message: "User not found"
 */
router.post('/user-profile/:id/badges', addBadgeController);

export default router;
