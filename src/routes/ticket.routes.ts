// routes/ticketRoutes.ts
import express from 'express';
import { getAdminTicketsController, submitTicketController } from '../controllers/ticket.controller';
import { authenticateToken } from '../middleware';

const router = express.Router();

/**
 * @swagger
 * /ticket/{reportId}:
 *   post:
 *     summary: Submit a ticket for a report
 *     description: |
 *       User can submit a ticket for a specific report. This request will associate the ticket 
 *       with the report and the user. The message provided will describe the issue with the report.
 *     tags:
 *       - Ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the report to submit a ticket for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userMessage:
 *                 type: string
 *                 example: "This report seems to be incomplete, please review it."
 *                 minLength: 10
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Ticket submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ticket submitted successfully
 *                 ticket:
 *                   type: object
 *                   properties:
 *                     report:
 *                       type: string
 *                       example: "67f924e2cbf331ebfcbe5f7e"
 *                     user:
 *                       type: string
 *                       example: "60d1b3f42f88d6a3c88a8e15"
 *                     userMessage:
 *                       type: string
 *                       example: "This report seems to be incomplete, please review it."
 *       400:
 *         description: Bad request (message is required or invalid)
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
 *       409:
 *         description: Conflict (you already submitted a ticket for this report)
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
router.post('/:reportId', authenticateToken, submitTicketController);



// authenticateToken must be isAdmin

/**
 * @swagger
 * /ticket/admin:
 *   get:
 *     summary: Get all tickets for admin
 *     description: |
 *       Admin can view all submitted tickets, which are sorted by creation time in descending order.
 *       This request will return a list of all tickets with the associated reports and user messages.
 *     tags:
 *        - Ticket
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   report:
 *                     type: string
 *                     example: "67f924e2cbf331ebfcbe5f7e"
 *                   user:
 *                     type: string
 *                     example: "60d1b3f42f88d6a3c88a8e15"
 *                   userMessage:
 *                     type: string
 *                     example: "This report seems to be incomplete, please review it."
 *                   status:
 *                     type: string
 *                     enum: [Pending, Accepted, Rejected]
 *                     example: "Pending"
 *       401:
 *         description: Unauthorized (missing or invalid token)
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

router.get('/admin', authenticateToken, getAdminTicketsController);


export default router;