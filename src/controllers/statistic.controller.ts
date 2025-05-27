import { Request, Response } from "express";
import { getApprovalStatusStats, getReportPriorityCounts, getReportsByDate, getUnresolvedAndResolvedReportStats, getUsersByScoreAndDate } from "../services/statistic.service";
import { Report } from "../models";
import { BadRequestError } from "../utils";
import { logger } from "../config";

export const getCountReportsByDateController = async (req: Request, res: Response) => {
    const { startDate } = req.query;

    try {
        const reports = await getReportsByDate(startDate as string | undefined);
        res.json(reports);
    } catch (err: any) {
        res.status(400).json({ message: 'Failed to respond to ticket', error: err.message });
    }
};
export const getReportsApprovalStatusController = async (req: Request, res: Response) => {
    try {
        const data = await getApprovalStatusStats();

        const statusMap: Record<number, string> = {
            0: 'Pending',
            1: 'Approved',
            2: 'Rejected'
        };

        const statusCounts = data.map(item => ({
            status: statusMap[item._id] || 'Unknown',
            count: item.count
        }));

        const totalReports = statusCounts.reduce((sum, item) => sum + item.count, 0);

        res.json({ totalReports, statusCounts });
    } catch (error: any) {
        res.status(400).json({ message: 'Server error', error: error.message });
    }
};



export const getPriorityReportStatsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = await getReportPriorityCounts();  // Call the service to get report stats

        const totalReports = data.reduce((acc, curr) => acc + curr.count, 0);  // Calculate total reports
        res.status(200).json({
            totalReports,
            priorityCounts: data  // Send both total and individual priority counts
        });
    } catch (error: any) {
        if (error instanceof BadRequestError) {
            res.status(400).json({ message: error.message });  // Handling BadRequestError
        } else {
            logger.error(`[Error] getPriorityReportStatsController\n ${error}`);  // Log server error
            res.status(500).json({ message: error.message });  // Handling InternalServerError
        }
    }
};

export const getUnresolvedAndResolvedReportStatsController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const data = await getUnresolvedAndResolvedReportStats();

        res.status(200).json({
            unresolvedReportsInLastMonth: data.unresolvedReportsInLastMonth,
            resolvedReportsInLastMonth: data.resolvedReportsInLastMonth,
            unresolvedPercentageInLastMonth: data.unresolvedPercentageInLastMonth,
            unresolvedReportsInLastWeek: data.unresolvedReportsInLastWeek,
            resolvedReportsInLastWeek: data.resolvedReportsInLastWeek,
            unresolvedPercentageInLastWeek: data.unresolvedPercentageInLastWeek,
            unresolvedReportsInLast3Days: data.unresolvedReportsInLast3Days,
            resolvedReportsInLast3Days: data.resolvedReportsInLast3Days,
            unresolvedPercentageInLast3Days: data.unresolvedPercentageInLast3Days,
            resolvedReportsInLast3DaysToNow: data.resolvedReportsInLast3DaysToNow,
            unresolvedPercentageInLast3DaysToNow: data.unresolvedPercentageInLast3DaysToNow,
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

export const getUsersByScoreAndDateController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const data = await getUsersByScoreAndDate();

        res.status(200).json({
            usersInLastMonth: data.usersInLastMonth,
            usersInLastWeek: data.usersInLastWeek,
            usersInLast3Days: data.usersInLast3Days,
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};