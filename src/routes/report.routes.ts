import express from 'express';
import { reportUpload, authenticateToken, partialAccess } from '../middleware';
import { createReportController, getUserReportsController } from '../controllers';

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

export default router;
