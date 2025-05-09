import express from 'express';
import { reportUpload, authenticateToken, partialAccess } from '../middleware';
import { addReportCommentController, createReportController, getReportCommentsController, getUserReportsController, searchInMapBounds, searchNearLocation } from '../controllers';

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: User report operations
 */

const router = express.Router();


/**
 * @swagger
 * /report/create-report:
 *   post:
 *     summary: Create a new report with images
 *     description: Creates a new report with uploaded images and stores them in MinIO
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - approximatePosition
 *               - location
 *               - city
 *               - category
 *               - images
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Pothole on Main Street"
 *                 minLength: 5
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 example: "Large pothole causing traffic issues"
 *                 minLength: 10
 *                 maxLength: 1000
 *               approximatePosition:
 *                 type: string
 *                 example: "Near Main St and 5th Ave"
 *               location:
 *                 type: string
 *                 description: JSON string of location object
 *                 example: '{"type":"Point","coordinates":[-73.987654,40.748817]}'
 *               city:
 *                 type: string
 *                 example: "New York"
 *               category:
 *                 type: string
 *                 description: Comma-separated list or array of categories
 *                 example: "Infrastructure,Public Safety"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 minItems: 1
 *                 maxItems: 5
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Report created successfully."
 *                 report:
 *                   $ref: '#/components/schemas/Report'
 *       400:
 *         description: Bad request (validation errors)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized (missing/invalid token)
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
 *     Report:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         approximatePosition:
 *           type: string
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [Point, Area]
 *             coordinates:
 *               type: array
 *               minItems: 2
 *               maxItems: 2
 *               items:
 *                 type: number
 *                 format: double
 *               example: [-73.987654, 40.748817]
 *         city:
 *           type: string
 *         category:
 *           type: array
 *           items:
 *             type: string
 *         images:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *               url:
 *                 type: string
 *         status:
 *           type: number
 *           enum: [0, 1, 2, 3]
 *         approvalStatus:
 *           type: number
 *         voteScore:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Error message describing what went wrong"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
router.post('/create-report', authenticateToken, reportUpload, createReportController);

/**
 * @swagger
 * /report/reports:
 *   get:
 *     summary: Get paginated reports for the authenticated user
 *     description: Returns a paginated list of reports belonging to the currently authenticated user
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page (1-100)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, score]
 *           default: newest
 *         description: Sorting criteria
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1, 2, 3]
 *         description: Filter by report status
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reports
 *                 data:
 *                   type: object
 *                   properties:
 *                     reports:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Report'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *                         limit:
 *                           type: integer
 *                           example: 10
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
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
 *     Report:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *         title:
 *           type: string
 *           example: Pothole on Main Street
 *         description:
 *           type: string
 *           example: Large pothole causing traffic issues
 *         status:
 *           type: integer
 *           enum: [0, 1, 2, 3]
 *           example: 0
 *         images:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *               url:
 *                 type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2023-05-15T10:00:00.000Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2023-05-15T10:00:00.000Z
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
router.get('/reports', authenticateToken, getUserReportsController);


/**
 * @swagger
 * /report/map-search:
 *   get:
 *     tags: [Reports]
 *     summary: Search reports within map bounds
 *     description: Returns reports within specified geographic bounding box, with optional filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: neLat
 *         required: true
 *         schema:
 *           type: number
 *           format: double
 *           example: 40.7128
 *         description: Northeast corner latitude (decimal degrees)
 *       - in: query
 *         name: neLng
 *         required: true
 *         schema:
 *           type: number
 *           format: double
 *           example: -74.0060
 *         description: Northeast corner longitude (decimal degrees)
 *       - in: query
 *         name: swLat
 *         required: true
 *         schema:
 *           type: number
 *           format: double
 *           example: 40.6900
 *         description: Southwest corner latitude (decimal degrees)
 *       - in: query
 *         name: swLng
 *         required: true
 *         schema:
 *           type: number
 *           format: double
 *           example: -74.0500
 *         description: Southwest corner longitude (decimal degrees)
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, done, notDone]
 *           default: all
 *           example: notDone
 *         description: |
 *           Filter by completion status:
 *           - all = All reports
 *           - done = Only completed reports (status 1 or 2)
 *           - notDone = Only incomplete reports
 *       - in: query
 *         name: zoom
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 22
 *           example: 12
 *         description: Current map zoom level (affects result limit for performance)
 *     responses:
 *       200:
 *         description: Successfully retrieved reports within bounds
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reports
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *       400:
 *         description: Bad request - invalid coordinates or parameters
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/map-search', partialAccess, searchInMapBounds);


/**
 * @swagger
 * /report/nearby-search:
 *   get:
 *     tags: [Reports]
 *     summary: Search reports near a location
 *     description: Returns reports within specified radius of a geographic point, with optional completion status filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           format: double
 *           example: 40.7128
 *         description: Latitude of the center point (decimal degrees)
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           format: double
 *           example: -74.0060
 *         description: Longitude of the center point (decimal degrees)
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 5000
 *           example: 2000
 *         description: Search radius in meters (default 5000m)
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, done, notDone]
 *           default: all
 *           example: notDone
 *         description: |
 *           Filter by completion status:
 *           - all = All reports
 *           - done = Only completed reports (status 1 or 2)
 *           - notDone = Only incomplete reports
 *     responses:
 *       200:
 *         description: Successfully retrieved nearby reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reports
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/nearby-search', partialAccess, searchNearLocation);
/**
 * @swagger
 * /reports/{reportId}/comments:
 *   post:
 *     summary: Add a comment to a report
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: This is a sample comment
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/reports/:reportId/comments', authenticateToken, addReportCommentController);



/**
 * @swagger
 * /reports/{reportId}/comments:
 *   get:
 *     summary: Get report comments
 *     description: Retrieve all comments for a specific report including user details
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *           format: ObjectId
 *           example: "507f1f77bcf86cd799439011"
 *         description: ID of the report to retrieve comments for
 *     responses:
 *       200:
 *         description: Successful operation - Returns array of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request - Invalid report ID format
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *       404:
 *         description: Not found - Report with specified ID doesn't exist
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: ObjectId
 *           example: "681c83bc922332ca7a7f2265"
 *           description: Unique identifier of the comment
 *         user:
 *           $ref: '#/components/schemas/CommentUser'
 *           description: User who created the comment
 *         text:
 *           type: string
 *           example: "This is a serious issue that needs immediate attention"
 *           description: Content of the comment
 *         date:
 *           type: string
 *           format: date-time
 *           example: "2025-05-08T10:13:16.719Z"
 *           description: Date and time when comment was created
 *       required:
 *         - _id
 *         - user
 *         - text
 *         - date
 * 
 *     CommentUser:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: ObjectId
 *           example: "680a9ba5ff6ff44d7e6e8757"
 *           description: Unique identifier of the user
 *         username:
 *           type: string
 *           example: "Amirhossein"
 *           description: Username of the comment author
 *       required:
 *         - _id
 *         - username
 */
router.get('/reports/:reportId/comments', authenticateToken, getReportCommentsController);


export default router;
