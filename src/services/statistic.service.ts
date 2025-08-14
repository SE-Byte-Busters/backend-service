import { Report, User } from "../models";

export const getReportsByDate = async (
    startDate?: string
): Promise<{ _id: string; count: number }[]> => {
    const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date();

    const reports = await Report.aggregate([
        {
            $match: {
                createdAt: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return reports;
};


interface IApprovalStatusStat {
    _id: number; // 0: Pending, 1: Approved, 2: Rejected
    count: number;
}

export const getApprovalStatusStats = async (): Promise<IApprovalStatusStat[]> => {
    const result = await Report.aggregate<IApprovalStatusStat>([
        {
            $group: {
                _id: '$approvalStatus',
                count: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    return result;
};

// services/statistics.service.ts


export const getReportPriorityCounts = async (): Promise<any[]> => {
    try {
        const priorityCounts = await Report.aggregate([
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    priority: "$_id",
                    count: 1
                }
            }
        ]);

        const priorities = ["High", "Medium", "Low"];
        const result = priorities.map(priority => {
            const found = priorityCounts.find(p => p.priority === priority);
            return {
                priority,
                count: found ? found.count : 0
            };
        });

        return result;
    } catch (error: any) {
        throw new Error(error.message);
    }
};

// Helper function to get stats for a specific period
const getStatsForPeriod = async (startDate: Date) => {
    // --- Queries based on CREATION date ---
    // Total reports created within the time period
    const totalCreated = await Report.countDocuments({
        createdAt: { $gte: startDate }
    });

    // Unresolved reports are those CREATED in the period that still don't have status: 1
    const unresolved = await Report.countDocuments({
        createdAt: { $gte: startDate },
        status: { $ne: 1 },
    });

    // --- Query based on UPDATE date ---
    // Resolved reports are those UPDATED to status: 1 within the time period
    const resolved = await Report.countDocuments({
        updatedAt: { $gte: startDate },
        status: 1,
    });

    // Calculate the percentage of UNRESOLVED reports from the TOTAL CREATED in the period
    const unresolvedPercentage = totalCreated ? (unresolved / totalCreated) * 100 : 0;

    return {
        total: totalCreated,
        resolved,
        unresolved,
        unresolvedPercentage
    };
};
// Your main function is now much cleaner
export const getUnresolvedAndResolvedReportStats = async (): Promise<any> => {
    const currentDate = new Date();

    const oneMonthAgo = new Date(currentDate);
    oneMonthAgo.setMonth(currentDate.getMonth() - 1);

    const oneWeekAgo = new Date(currentDate);
    oneWeekAgo.setDate(currentDate.getDate() - 7);

    const threeDaysAgo = new Date(currentDate);
    threeDaysAgo.setDate(currentDate.getDate() - 3);

    // Get stats for each period by calling the helper function
    const lastMonthStats = await getStatsForPeriod(oneMonthAgo);
    const lastWeekStats = await getStatsForPeriod(oneWeekAgo);
    const last3DaysStats = await getStatsForPeriod(threeDaysAgo);

    // Also fixed a copy-paste bug from your original return object
    return {
        unresolvedReportsInLastMonth: lastMonthStats.unresolved,
        resolvedReportsInLastMonth: lastMonthStats.resolved,
        unresolvedPercentageInLastMonth: lastMonthStats.unresolvedPercentage,
        unresolvedReportsInLastWeek: lastWeekStats.unresolved,
        resolvedReportsInLastWeek: lastWeekStats.resolved,
        unresolvedPercentageInLastWeek: lastWeekStats.unresolvedPercentage,
        unresolvedReportsInLast3Days: last3DaysStats.unresolved,
        resolvedReportsInLast3Days: last3DaysStats.resolved,
        unresolvedPercentageInLast3Days: last3DaysStats.unresolvedPercentage,
    };
};



export const getUsersByScoreAndDate = async (): Promise<any> => {
    const currentDate = new Date();

    const oneMonthAgo = new Date(currentDate);
    oneMonthAgo.setMonth(currentDate.getMonth() - 1);

    const oneWeekAgo = new Date(currentDate);
    oneWeekAgo.setDate(currentDate.getDate() - 7);

    const threeDaysAgo = new Date(currentDate);
    threeDaysAgo.setDate(currentDate.getDate() - 3);

    // دریافت کاربران در یک ماه گذشته
    const usersInLastMonth = await User.aggregate([
        { $match: { createdAt: { $gte: oneMonthAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                users: { $push: "$_id" },
                averageScore: { $avg: "$score" }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    const usersInLastWeek = await User.aggregate([
        { $match: { createdAt: { $gte: oneWeekAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                users: { $push: "$_id" },
                averageScore: { $avg: "$score" }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    const usersInLast3Days = await User.aggregate([
        { $match: { createdAt: { $gte: threeDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                users: { $push: "$_id" },
                averageScore: { $avg: "$score" }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    return {
        usersInLastMonth,
        usersInLastWeek,
        usersInLast3Days,
    };
};