import { Router } from "express";
import { authenticateToken } from "../middleware";
import { createCommentController, getAllCommentsController, rateCommentController } from "../controllers/comment.controller";


const router = Router();

/**
 * @swagger
 * /comment:
 *   post:
 *     summary: Create a new comment
 *     tags:
 *       - Comment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: This is my comment.
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, createCommentController);

/**
 * @swagger
 * /comment/{commentId}/rate:
 *   post:
 *     summary: Rate a comment between 0 to 5
 *     tags:
 *       - Comment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: commentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the comment to rate
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
 *                 maximum: 5
 *                 example: 4.5
 *     responses:
 *       200:
 *         description: Rating submitted successfully
 *       400:
 *         description: Invalid score or request
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
router.post('/:commentId/rate', authenticateToken, rateCommentController);



/**
 * @swagger
 * /comment:
 *   get:
 *     summary: Get all comments with pagination /api/comment?page=1&limit=5
 *     tags:
 *       - Comment
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of comments per page
 *     responses:
 *       200:
 *         description: A list of comments
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, getAllCommentsController);

export default router;
