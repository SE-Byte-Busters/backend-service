// routes/ticketRoutes.ts
import express from 'express';
import { getAdminTicketsController, getUserTicketsController, respondToTicketController, submitTicketController } from '../controllers/ticket.controller';
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
// respondToTicketController

/**
 * @swagger
 * /ticket/{ticketId}/admin/responseticket:
 *   post:
 *     summary: Admin responds to a user ticket
 *     description: |
 *       Allows an admin to respond to a specific ticket by providing a decision note.
 *       Only one response is allowed per ticket.
 *     tags: 
 *        - Ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         description: ID of the ticket to respond to
 *         schema:
 *           type: string
 *           example: 664287fd4f2394c29d07e5f1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               decisionNote:
 *                 type: string
 *                 description: Admin's response or explanation
 *                 example: The issue is valid and has been escalated.
 *     responses:
 *       200:
 *         description: Ticket responded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ticket responded successfully
 *                 ticket:
 *                   $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Bad request (e.g. missing note)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ticket not found or admin not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Ticket already has a response
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
 *     Ticket:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68225a43fd567274d4b5dc14
 *         report:
 *           type: string
 *           example: 67f924e2cbf331ebfcbe5f7e
 *         user:
 *           type: string
 *           example: 680a9ba5ff6ff44d7e6e8757
 *         userMessage:
 *           type: string
 *           example: این گزارش درست نیست من اینجا را دیده ام
 *         status:
 *           type: string
 *           example: Pending
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-05-12T20:29:55.904Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2025-05-13T06:26:09.776Z
 *         admin:
 *           type: string
 *           example: 680a9ba5ff6ff44d7e6e8757
 *         adminDecisionNote:
 *           type: string
 *           example: تیکت شما بررسی شد و صحت ان تایید شد ممنون
 *         respondedAt:
 *           type: string
 *           format: date-time
 *           example: 2025-05-13T06:26:09.772Z
 *         id:
 *           type: string
 *           example: 68225a43fd567274d4b5dc14
 */


router.post('/:ticketId/admin/responseticket', authenticateToken, respondToTicketController);



/**
 * @swagger
 * /ticket/user:
 *   get:
 *     summary: Get all tickets submitted by the current user
 *     description: Retrieves a list of all tickets submitted by the authenticated user including admin responses if available.
 *     tags: [Ticket]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User tickets retrieved successfully
 *                 tickets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 68225a43fd567274d4b5dc14
 *                       report:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 67f924e2cbf331ebfcbe5f7e
 *                           title:
 *                             type: string
 *                             example: خیابان خراب شده
 *                       userMessage:
 *                         type: string
 *                         example: این گزارش نادرست است
 *                       adminDecisionNote:
 *                         type: string
 *                         example: بررسی شد و تایید شد
 *                       respondedAt:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       admin:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           username:
 *                             type: string
 *                     required:
 *                       - _id
 *                       - report
 *                       - userMessage
 *                       - createdAt
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       500:
 *         description: Internal server error
 */

router.get('/user', authenticateToken, getUserTicketsController);


export default router;