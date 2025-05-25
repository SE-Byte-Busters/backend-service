import { Report, User } from "../models";

export const getReportsByDate = async (
    startDate?: string
): Promise<{ _id: string; count: number }[]> => {
    const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 روز پیش
    const end = new Date(); // زمان فعلی

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

export const getUnresolvedAndResolvedReportStats = async (): Promise<any> => {
    const currentDate = new Date();

    const oneMonthAgo = new Date(currentDate);
    oneMonthAgo.setMonth(currentDate.getMonth() - 1);

    const oneWeekAgo = new Date(currentDate);
    oneWeekAgo.setDate(currentDate.getDate() - 7);

    const threeDaysAgo = new Date(currentDate);
    threeDaysAgo.setDate(currentDate.getDate() - 3);

    // محاسبه گزارشات حل‌شده و حل‌نشده در یک ماه گذشته
    const totalReportsInLastMonth = await Report.countDocuments({
        createdAt: { $gte: oneMonthAgo },
    });
    const unresolvedReportsInLastMonth = await Report.countDocuments({
        createdAt: { $gte: oneMonthAgo },
        resolvedAt: { $exists: false }, // بررسی گزارشات حل‌نشده
    });
    const resolvedReportsInLastMonth = await Report.countDocuments({
        createdAt: { $gte: oneMonthAgo },
        resolvedAt: { $ne: null }, // بررسی گزارشات حل‌شده
    });

    const unresolvedPercentageInLastMonth = totalReportsInLastMonth
        ? (unresolvedReportsInLastMonth / totalReportsInLastMonth) * 100
        : 0;

    // محاسبه گزارشات حل‌شده و حل‌نشده در یک هفته گذشته
    const totalReportsInLastWeek = await Report.countDocuments({
        createdAt: { $gte: oneWeekAgo },
    });
    const unresolvedReportsInLastWeek = await Report.countDocuments({
        createdAt: { $gte: oneWeekAgo },
        resolvedAt: { $exists: false }, // بررسی گزارشات حل‌نشده
    });
    const resolvedReportsInLastWeek = await Report.countDocuments({
        createdAt: { $gte: oneWeekAgo },
        resolvedAt: { $ne: null }, // بررسی گزارشات حل‌شده
    });

    const unresolvedPercentageInLastWeek = totalReportsInLastWeek
        ? (unresolvedReportsInLastWeek / totalReportsInLastWeek) * 100
        : 0;

    // محاسبه گزارشات حل‌شده و حل‌نشده در سه روز گذشته
    const totalReportsInLast3Days = await Report.countDocuments({
        createdAt: { $gte: threeDaysAgo },
    });
    const unresolvedReportsInLast3Days = await Report.countDocuments({
        createdAt: { $gte: threeDaysAgo },
        resolvedAt: { $exists: false }, // بررسی گزارشات حل‌نشده
    });
    const resolvedReportsInLast3Days = await Report.countDocuments({
        createdAt: { $gte: threeDaysAgo },
        resolvedAt: { $ne: null }, // بررسی گزارشات حل‌شده
    });

    const unresolvedPercentageInLast3Days = totalReportsInLast3Days
        ? (unresolvedReportsInLast3Days / totalReportsInLast3Days) * 100
        : 0;

    // محاسبه گزارشات حل‌شده و حل‌نشده از سه روز پیش تا الان
    const totalReportsInLast3DaysToNow = await Report.countDocuments({
        createdAt: { $gte: threeDaysAgo, $lte: currentDate },
    });
    const unresolvedReportsInLast3DaysToNow = await Report.countDocuments({
        createdAt: { $gte: threeDaysAgo, $lte: currentDate },
        resolvedAt: { $exists: false }, // بررسی گزارشات حل‌نشده
    });
    const resolvedReportsInLast3DaysToNow = await Report.countDocuments({
        createdAt: { $gte: threeDaysAgo, $lte: currentDate },
        resolvedAt: { $ne: null }, // بررسی گزارشات حل‌شده
    });

    const unresolvedPercentageInLast3DaysToNow = totalReportsInLast3DaysToNow
        ? (unresolvedReportsInLast3DaysToNow / totalReportsInLast3DaysToNow) * 100
        : 0;

    return {
        unresolvedReportsInLastMonth,
        resolvedReportsInLastMonth,
        unresolvedPercentageInLastMonth,
        unresolvedReportsInLastWeek,
        resolvedReportsInLastWeek,
        unresolvedPercentageInLastWeek,
        unresolvedReportsInLast3Days,
        resolvedReportsInLast3Days,
        unresolvedPercentageInLast3Days,
        unresolvedReportsInLast3DaysToNow,
        resolvedReportsInLast3DaysToNow,
        unresolvedPercentageInLast3DaysToNow,
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

    // دریافت کاربران در یک هفته گذشته
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

    // دریافت کاربران در سه روز گذشته
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