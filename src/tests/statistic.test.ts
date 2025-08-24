import mongoose, { Types } from 'mongoose';
import {
    getReportsByDate,
    getApprovalStatusStats,
    getReportPriorityCounts,
    getUnresolvedAndResolvedReportStats,
    getUsersByScoreAndDate,
} from '../services/statistic.service'; // Adjust path as needed
import { Report, User } from '../models';

//================================================================
//==                         Mocks                              ==
//================================================================

// Mock Mongoose Models
jest.mock('../models/report.model', () => ({
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
}));
jest.mock('../models/user.model', () => ({
    aggregate: jest.fn(),
}));


//================================================================
//==                       Test Suite                           ==
//================================================================

describe('Statistics Service', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    //----------------------------------------------------------------
    // 1. Tests for getReportsByDate
    //----------------------------------------------------------------
    describe('getReportsByDate', () => {
        it('should return an aggregation of reports grouped by date', async () => {
            const mockAggregation = [
                { _id: '2023-10-26', count: 5 },
                { _id: '2023-10-27', count: 8 },
            ];
            (Report.aggregate as jest.Mock).mockResolvedValue(mockAggregation);

            const result = await getReportsByDate();

            expect(Report.aggregate).toHaveBeenCalled();
            expect(result).toEqual(mockAggregation);
            expect(result.length).toBe(2);
            expect(result[0].count).toBe(5);
        });
    });

    //----------------------------------------------------------------
    // 2. Tests for getApprovalStatusStats
    //----------------------------------------------------------------
    describe('getApprovalStatusStats', () => {
        it('should return the count of reports for each approval status', async () => {
            const mockStats = [
                { _id: 0, count: 10 }, // Pending
                { _id: 1, count: 25 }, // Approved
            ];
            (Report.aggregate as jest.Mock).mockResolvedValue(mockStats);

            const result = await getApprovalStatusStats();

            expect(Report.aggregate).toHaveBeenCalled();
            expect(result).toEqual(mockStats);
            expect(result[0]._id).toBe(0);
        });
    });

    //----------------------------------------------------------------
    // 3. Tests for getReportPriorityCounts
    //----------------------------------------------------------------
    describe('getReportPriorityCounts', () => {
        it('should return counts for each priority, including zeros for missing priorities', async () => {
            const mockDbResult = [
                { priority: 'High', count: 5 },
                { priority: 'Low', count: 12 },
            ];
            (Report.aggregate as jest.Mock).mockResolvedValue(mockDbResult);

            const result = await getReportPriorityCounts();

            const expectedResult = [
                { priority: 'High', count: 5 },
                { priority: 'Medium', count: 0 },
                { priority: 'Low', count: 12 },
            ];

            expect(Report.aggregate).toHaveBeenCalled();
            expect(result).toEqual(expectedResult);
        });
    });

    //----------------------------------------------------------------
    // 4. Tests for getUnresolvedAndResolvedReportStats
    //----------------------------------------------------------------
    describe('getUnresolvedAndResolvedReportStats', () => {
        it('should return resolved and unresolved stats for different periods', async () => {
            // Mock calls for last month
            (Report.countDocuments as jest.Mock)
                .mockResolvedValueOnce(100) // total created
                .mockResolvedValueOnce(40)  // unresolved
                .mockResolvedValueOnce(50)  // resolved
                // Mock calls for last week
                .mockResolvedValueOnce(50)  // total created
                .mockResolvedValueOnce(15)  // unresolved
                .mockResolvedValueOnce(30)  // resolved
                // Mock calls for last 3 days
                .mockResolvedValueOnce(20)  // total created
                .mockResolvedValueOnce(5)   // unresolved
                .mockResolvedValueOnce(10); // resolved

            const result = await getUnresolvedAndResolvedReportStats();

            expect(Report.countDocuments).toHaveBeenCalledTimes(9);
            expect(result.unresolvedReportsInLastMonth).toBe(40);
            expect(result.resolvedReportsInLastMonth).toBe(50);
            expect(result.unresolvedPercentageInLastMonth).toBe(40);
            expect(result.unresolvedReportsInLastWeek).toBe(15);
            expect(result.resolvedReportsInLastWeek).toBe(30);
            expect(result.unresolvedPercentageInLastWeek).toBe(30);
            expect(result.unresolvedReportsInLast3Days).toBe(5);
            expect(result.resolvedReportsInLast3Days).toBe(10);
            expect(result.unresolvedPercentageInLast3Days).toBe(25);
        });
    });

    //----------------------------------------------------------------
    // 5. Tests for getUsersByScoreAndDate
    //----------------------------------------------------------------
    describe('getUsersByScoreAndDate', () => {
        it('should return user stats for different periods', async () => {
            const mockMonthData = [{ _id: '2023-09-27', users: [new Types.ObjectId()], averageScore: 85 }];
            const mockWeekData = [{ _id: '2023-10-20', users: [new Types.ObjectId()], averageScore: 90 }];
            const mock3DaysData = [{ _id: '2023-10-25', users: [new Types.ObjectId()], averageScore: 95 }];

            (User.aggregate as jest.Mock)
                .mockResolvedValueOnce(mockMonthData)
                .mockResolvedValueOnce(mockWeekData)
                .mockResolvedValueOnce(mock3DaysData);

            const result = await getUsersByScoreAndDate();

            expect(User.aggregate).toHaveBeenCalledTimes(3);
            expect(result.usersInLastMonth).toEqual(mockMonthData);
            expect(result.usersInLastWeek).toEqual(mockWeekData);
            expect(result.usersInLast3Days).toEqual(mock3DaysData);
        });
    });

});
