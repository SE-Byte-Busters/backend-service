import express from 'express';
import { getCountReportsByDateController, getPriorityReportStatsController, getReportsApprovalStatusController, getUnresolvedAndResolvedReportStatsController, getUsersByScoreAndDateController } from '../controllers';
import { authenticateToken } from '../middleware';

const router = express.Router();
/**
 * @swagger
 * /statistic/reports-by-date:
 *   get:
 *     summary: Get number of reports by date
 *     description: Returns the number of reports submitted each day starting from a specific date until now. If `startDate` is not provided, the last 30 days will be used by default.
 *     tags:
 *       - Statistic
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Start date in YYYY-MM-DD format (e.g., 2025-04-01)
 *     responses:
 *       200:
 *         description: List of report counts grouped by day
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "2025-04-11"
 *                   count:
 *                     type: integer
 *                     example: 1
 *             examples:
 *               sample:
 *                 summary: Sample output
 *                 value:
 *                   - _id: "2025-04-11"
 *                     count: 1
 *                   - _id: "2025-04-27"
 *                     count: 4
 *                   - _id: "2025-04-28"
 *                     count: 2
 *                   - _id: "2025-04-29"
 *                     count: 1
 *                   - _id: "2025-05-11"
 *                     count: 1
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 *
 *     x-codeSamples:
 *       - lang: curl
 *         label: Get reports by date
 *         source: |
 *           curl -X GET "http://localhost:3000/api/v1/statistics/reports-by-date?startDate=2025-04-01" -H "accept: application/json"
 */


router.get('/reports-by-date', getCountReportsByDateController);

/**
 * @swagger
 * /statistic/reports-approval-status:
 *   get:
 *     summary: Get count of reports grouped by approval status
 *     description: Retrieves the total number of reports and their approval status counts (Pending, Approved, Rejected).
 *     tags: [Statistic]
 *     responses:
 *       200:
 *         description: Successfully retrieved the approval status counts along with the total report count.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalReports:
 *                   type: integer
 *                   description: Total number of reports in the system.
 *                   example: 9
 *                 statusCounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                         description: The approval status of the report.
 *                         enum: [Pending, Approved, Rejected]
 *                       count:
 *                         type: integer
 *                         description: The count of reports with the specific status.
 *                         example: 3
 *             example:
 *               totalReports: 9
 *               statusCounts:
 *                 - status: "Pending"
 *                   count: 3
 *                 - status: "Approved"
 *                   count: 5
 *                 - status: "Rejected"
 *                   count: 1
 *       500:
 *         description: Server error when retrieving statistics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error"
 *                 error:
 *                   type: string
 *                   example: "Error fetching approval status stats"
 */

router.get('/reports-approval-status', getReportsApprovalStatusController);

/**
 * @swagger
 * /statistic/reports-by-priority:
 *   get:
 *     summary: Get report statistics by priority
 *     description: Returns the total number of reports and the number of reports for each priority (High, Medium, Low).
 *     tags:
 *       - Statistic
 *     responses:
 *       200:
 *         description: Total number of reports and count of reports by each priority
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalReports:
 *                   type: integer
 *                   example: 9
 *                 priorityCounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       priority:
 *                         type: string
 *                         enum:
 *                           - High
 *                           - Medium
 *                           - Low
 *                         example: "High"
 *                       count:
 *                         type: integer
 *                         example: 4
 *             examples:
 *               sample:
 *                 summary: Sample output
 *                 value:
 *                   totalReports: 9
 *                   priorityCounts:
 *                     - priority: "High"
 *                       count: 4
 *                     - priority: "Medium"
 *                       count: 3
 *                     - priority: "Low"
 *                       count: 2
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 *
 *     x-codeSamples:
 *       - lang: curl
 *         label: Get reports by priority
 *         source: |
 *           curl -X GET "http://localhost:3000/api/v1/statistics/reports-by-priority" -H "accept: application/json"
 */
router.get('/reports/priority', getPriorityReportStatsController);


/**
 * @swagger
 * /statistic/reports-resolved-unresolved:
 *   get:
 *     summary: Get the number and percentage of unresolved and resolved reports
 *     description: Returns the number and percentage of unresolved and resolved reports within the last month, week, and 3 days based on the `resolvedAt` field.
 *     tags:
 *       - Statistic
 *     responses:
 *       200:
 *         description: Number and percentage of unresolved and resolved reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unresolvedReportsInLastMonth:
 *                   type: integer
 *                   example: 3
 *                 resolvedReportsInLastMonth:
 *                   type: integer
 *                   example: 6
 *                 unresolvedPercentageInLastMonth:
 *                   type: number
 *                   example: 33.33
 *                 unresolvedReportsInLastWeek:
 *                   type: integer
 *                   example: 1
 *                 resolvedReportsInLastWeek:
 *                   type: integer
 *                   example: 2
 *                 unresolvedPercentageInLastWeek:
 *                   type: number
 *                   example: 33.33
 *                 unresolvedReportsInLast3Days:
 *                   type: integer
 *                   example: 1
 *                 resolvedReportsInLast3Days:
 *                   type: integer
 *                   example: 0
 *                 unresolvedPercentageInLast3Days:
 *                   type: number
 *                   example: 100
 *       500:
 *         description: Internal server error
 *
 *     x-codeSamples:
 *       - lang: curl
 *         label: Get unresolved and resolved reports
 *         source: |
 *           curl -X GET "http://localhost:3000/api/v1/statistics/reports-resolved-unresolved" -H "accept: application/json"
 */
router.get('/reports-resolved-unresolved', authenticateToken, getUnresolvedAndResolvedReportStatsController);



/**
 * @swagger
 * /statistic/users-by-score-date:
 *   get:
 *     summary: Get the number of users registered by score and date
 *     description: Returns the number of users registered each day in the last month, week, and 3 days, along with the average score.
 *     tags:
 *       - Statistic
 *     responses:
 *       200:
 *         description: List of users grouped by date with their average score
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 usersInLastMonth:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "2025-04-11"
 *                       users:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["userId1", "userId2"]
 *                       averageScore:
 *                         type: number
 *                         example: 75
 *                 usersInLastWeek:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "2025-05-01"
 *                       users:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["userId1", "userId2"]
 *                       averageScore:
 *                         type: number
 *                         example: 80
 *                 usersInLast3Days:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "2025-05-10"
 *                       users:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["userId1", "userId2"]
 *                       averageScore:
 *                         type: number
 *                         example: 90
 *       500:
 *         description: Internal server error
 *
 *     x-codeSamples:
 *       - lang: curl
 *         label: Get users by score and date
 *         source: |
 *           curl -X GET "http://localhost:3000/api/v1/statistics/users-by-score-date" -H "accept: application/json"
 */
router.get('/users-by-score-date', authenticateToken, getUsersByScoreAndDateController);

export default router;

