import mongoose, { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
    createReportWithImages,
    getUserReports,
    searchReportsInMapArea,
    searchReportsNearLocation,
    addCommentService,
    getReportCommentsService,
    addReqSolveReportService,
    getReqSolvesReportService,
    setReportResolvedByService,
    getReportByIdService,
    updatePriorityAndApprovalStatus,
    voteOnReport
} from '../services/report.service'; // Adjust path as needed
import Report from '../models/report.model';
import { User } from '../models';
import { MinioBuckets, config } from '../config';
import { BadRequestError, NotFoundError } from '../utils';
import { notif } from '../utils/notif.utils';
import { notifyUser } from '../services/notification.service';

//================================================================
//==                         Mocks                              ==
//================================================================

// Mock Mongoose Models
jest.mock('../models/report.model');
jest.mock('../models/user.model');

// Mock external utilities and services
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-1234'),
}));
jest.mock('../utils/notif.utils', () => ({
    notif: jest.fn(),
}));
jest.mock('../services/notification.service', () => ({
    notifyUser: jest.fn(),
}));

// Mock Minio Client and Config
jest.mock('../config', () => ({
    config: {
        minioConfig: {
            useSSL: false,
            endpoint: 'localhost',
            port: 9000,
        },
    },
    MinioBuckets: {
        reports: {
            client: {
                putObject: jest.fn().mockResolvedValue({ etag: 'mock-etag' }),
                removeObject: jest.fn().mockResolvedValue(true),
            },
            bucket: 'reports-bucket',
        },
    },
}));

// A helper to create a mock file object for tests
const createMockFile = (originalname: string, buffer: Buffer): Express.Multer.File => ({
    fieldname: 'images', originalname, encoding: '7bit', mimetype: 'image/jpeg',
    size: buffer.length, buffer, stream: null as any, destination: '',
    filename: '', path: '',
});


//================================================================
//==                       Test Suite                           ==
//================================================================

describe('Report Service', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    //----------------------------------------------------------------
    // 1. Tests for createReportWithImages
    //----------------------------------------------------------------
    describe('createReportWithImages', () => {
        const mockFile = createMockFile('test.jpg', Buffer.from('test-image'));
        const reportParams = {
            user: new Types.ObjectId().toHexString(), title: 'Test Report', description: 'A test description',
            approximatePosition: 'Near the park', location: { type: 'Point' as const, coordinates: [10, 20] },
            images: [mockFile],
        };

        it('should create a report and upload images successfully', async () => {
            const createdReport = { _id: new Types.ObjectId(), ...reportParams };
            (Report.create as jest.Mock).mockResolvedValue(createdReport);
            (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

            const result = await createReportWithImages(reportParams);

            expect(MinioBuckets.reports.client.putObject).toHaveBeenCalledTimes(1);
            expect(Report.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test Report' }));
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(reportParams.user, { lastActivity: expect.any(Date) });
            expect(result).toEqual(createdReport);
        });

        it('should throw BadRequestError if no images are provided', async () => {
            await expect(createReportWithImages({ ...reportParams, images: [] })).rejects.toThrow('At least one image is required');
        });

        it('should clean up uploaded images if report creation fails', async () => {
            (Report.create as jest.Mock).mockRejectedValue(new Error('Database error'));
            await expect(createReportWithImages(reportParams)).rejects.toThrow('Database error');
            expect(MinioBuckets.reports.client.removeObject).toHaveBeenCalledWith('reports-bucket', 'reports/mock-uuid-1234.jpg');
        });

        it('should throw BadRequestError for unsupported Area location type', async () => {
            const areaParams = { ...reportParams, location: { type: 'Area' as const, coordinates: [1, 2, 3, 4] } };
            await expect(createReportWithImages(areaParams)).rejects.toThrow('Area locations will be available in next version');
        });
    });

    //----------------------------------------------------------------
    // 2. Tests for getUserReports
    //----------------------------------------------------------------
    describe('getUserReports', () => {
        const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([{ title: 'Report 1' }]),
        };
        beforeEach(() => {
            (Report.find as jest.Mock).mockReturnValue(mockQuery);
            (Report.countDocuments as jest.Mock).mockResolvedValue(1);
        });

        it('should fetch user reports sorted by oldest', async () => {
            await getUserReports({ userId: 'some-user-id', sortBy: 'oldest' });
            expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: 1 });
        });

        it('should fetch user reports sorted by score', async () => {
            await getUserReports({ userId: 'some-user-id', sortBy: 'score' });
            expect(mockQuery.sort).toHaveBeenCalledWith({ score: -1 });
        });

        it('should correctly apply pagination', async () => {
            await getUserReports({ userId: 'some-user-id', page: 3, limit: 20 });
            expect(mockQuery.skip).toHaveBeenCalledWith(40);
            expect(mockQuery.limit).toHaveBeenCalledWith(20);
        });
    });

    //----------------------------------------------------------------
    // 3. Tests for searchReportsInMapArea
    //----------------------------------------------------------------
    describe('searchReportsInMapArea', () => {
        const mockQuery = {
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([{ title: 'Found Report' }]),
        };
        const bounds = { ne: { lat: 1, lng: 1 }, sw: { lat: 0, lng: 0 } };
        beforeEach(() => {
            (Report.find as jest.Mock).mockReturnValue(mockQuery);
        });

        it('should filter for "done" reports', async () => {
            await searchReportsInMapArea({ bounds, completionFilter: 'done' });
            expect(Report.find).toHaveBeenCalledWith(expect.objectContaining({ completionStatus: { $in: [1] } }));
        });

        it('should increase limit on high zoom', async () => {
            await searchReportsInMapArea({ bounds, zoomLevel: 15 });
            expect(mockQuery.limit).toHaveBeenCalledWith(500);
        });

        it('should use default limit on low zoom', async () => {
            await searchReportsInMapArea({ bounds, zoomLevel: 9 });
            expect(mockQuery.limit).toHaveBeenCalledWith(200);
        });
    });

    //----------------------------------------------------------------
    // 4. Tests for searchReportsNearLocation
    //----------------------------------------------------------------
    describe('searchReportsNearLocation', () => {
        const mockQuery = {
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([{ title: 'Nearby Report' }]),
        };
        const center = { lat: 0, lng: 0 };
        beforeEach(() => {
            (Report.find as jest.Mock).mockReturnValue(mockQuery);
        });

        it('should filter for "notDone" reports', async () => {
            await searchReportsNearLocation(center, 1000, 'notDone');
            expect(Report.find).toHaveBeenCalledWith(expect.objectContaining({ completionStatus: { $nin: [1, 2] } }));
        });

        it('should return an empty array if no reports are found', async () => {
            mockQuery.exec.mockResolvedValue([]);
            const result = await searchReportsNearLocation(center, 1000);
            expect(result).toEqual([]);
        });

        it('should correctly build the $centerSphere query', async () => {
            await searchReportsNearLocation(center, 1000);
            const findCall = (Report.find as jest.Mock).mock.calls[0][0];
            expect(findCall['location.coordinates'].$geoWithin.$centerSphere[0]).toEqual([0, 0]);
        });
    });


    //----------------------------------------------------------------
    // 5. Tests for addCommentService
    //----------------------------------------------------------------
    describe('addCommentService', () => {
        const reportId = new Types.ObjectId().toHexString();
        const userId = new Types.ObjectId().toHexString();
        const mockReport = {
            _id: reportId,
            comments: [] as any[],
            save: jest.fn().mockResolvedValue(true),
        };
        beforeEach(() => {
            mockReport.comments = [];
            (Report.findById as jest.Mock).mockResolvedValue(mockReport);
        });

        it('should add a comment successfully', async () => {
            (User.findById as jest.Mock).mockResolvedValue({ _id: userId, username: 'testuser' });
            (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
            const result = await addCommentService(reportId, userId, 'This is a comment');
            expect(mockReport.save).toHaveBeenCalled();
            expect(result.message).toBe('Comment added successfully');
        });

        it('should throw error for empty text', async () => {
            await expect(addCommentService(reportId, userId, '  ')).rejects.toThrow('Comment text is required');
        });

        it('should throw error if user is not found by ID', async () => {
            await expect(addCommentService(reportId, undefined, 'text')).rejects.toThrow('User not found');
        });
    });

    //----------------------------------------------------------------
    // 6. Tests for getReportCommentsService
    //----------------------------------------------------------------
    describe('getReportCommentsService', () => {
        const reportId = new Types.ObjectId().toHexString();
        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(),
            exec: jest.fn(),
        };
        beforeEach(() => {
            (Report.findById as jest.Mock).mockReturnValue(mockQuery);
        });

        it('should throw error for invalid report ID', async () => {
            await expect(getReportCommentsService('invalid-id')).rejects.toThrow('Invalid Report ID');
        });

        it('should throw error if report not found', async () => {
            mockQuery.exec.mockResolvedValue(null);
            await expect(getReportCommentsService(reportId)).rejects.toThrow('Report not found or has no comments');
        });

        it('should return an empty array if a report has no comments', async () => {
            const mockReport = { comments: [] };
            mockQuery.exec.mockResolvedValue(mockReport);
            const result = await getReportCommentsService(reportId);
            expect(result).toEqual([]);
        });
    });


    //----------------------------------------------------------------
    // 7. Tests for addReqSolveReportService
    //----------------------------------------------------------------
    describe('addReqSolveReportService', () => {
        const reportId = new Types.ObjectId().toHexString();
        const userId = new Types.ObjectId().toHexString();
        const mockReport = {
            _id: reportId,
            usersReqSolve: [] as any[],
            save: jest.fn().mockResolvedValue(true),
        };
        beforeEach(() => {
            mockReport.usersReqSolve = [];
            (Report.findById as jest.Mock).mockResolvedValue(mockReport);
        });

        it('should add a solve request successfully', async () => {
            (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
            const result = await addReqSolveReportService(reportId, userId, 'I can solve this');
            expect(mockReport.save).toHaveBeenCalled();
            expect(result.message).toBe('Request added successfully');
        });

        it('should throw error for empty text', async () => {
            await expect(addReqSolveReportService(reportId, userId, '')).rejects.toThrow('Request text is required');
        });

        it('should throw error if user ID is invalid', async () => {
            await expect(addReqSolveReportService(reportId, 'invalid-id', 'text')).rejects.toThrow('Invalid user ID');
        });
    });

    //----------------------------------------------------------------
    // 8. Tests for getReqSolvesReportService
    //----------------------------------------------------------------
    describe('getReqSolvesReportService', () => {
        const reportId = new Types.ObjectId().toHexString();
        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(),
            exec: jest.fn(),
        };
        beforeEach(() => {
            (Report.findById as jest.Mock).mockReturnValue(mockQuery);
        });

        it('should throw error for invalid report ID', async () => {
            await expect(getReqSolvesReportService('invalid-id')).rejects.toThrow('Invalid report ID');
        });

        it('should throw error if report not found', async () => {
            mockQuery.exec.mockResolvedValue(null);
            await expect(getReqSolvesReportService(reportId)).rejects.toThrow('Report not found or has no solve requests');
        });

        it('should return mapped solve requests successfully', async () => {
            const mockReq = { _id: 'req1', user: { _id: 'user1', username: 'solver' }, text: 'Done', date: new Date() };
            mockQuery.exec.mockResolvedValue({ usersReqSolve: [mockReq] });
            const result = await getReqSolvesReportService(reportId);
            expect(result[0].user.username).toBe('solver');
        });
    });

    //----------------------------------------------------------------
    // 9. Tests for setReportResolvedByService
    //----------------------------------------------------------------
    describe('setReportResolvedByService', () => {
        const reportId = new Types.ObjectId().toHexString();
        const userId = new Types.ObjectId().toHexString();

        it('should mark a report as resolved successfully', async () => {
            const mockReport = { save: jest.fn().mockResolvedValue(true) };
            (Report.findById as jest.Mock).mockResolvedValue(mockReport);
            const result = await setReportResolvedByService(reportId, userId);
            expect(mockReport.save).toHaveBeenCalled();
            expect(result.message).toBe('Report marked as resolved');
        });

        it('should throw error if report not found', async () => {
            (Report.findById as jest.Mock).mockResolvedValue(null);
            await expect(setReportResolvedByService(reportId, userId)).rejects.toThrow('Report not found');
        });

        it('should throw error if user ID is missing', async () => {
            await expect(setReportResolvedByService(reportId, undefined)).rejects.toThrow('Invalid user ID');
        });
    });

    //----------------------------------------------------------------
    // 10. Tests for getReportByIdService
    //----------------------------------------------------------------
    describe('getReportByIdService', () => {
        const reportId = new Types.ObjectId().toHexString();
        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(),
            exec: jest.fn(),
        };
        beforeEach(() => {
            (Report.findById as jest.Mock).mockReturnValue(mockQuery);
        });

        it('should return a single report successfully', async () => {
            mockQuery.exec.mockResolvedValue({ _id: reportId, title: 'Specific Report' });
            const result = await getReportByIdService(reportId);
            expect(result.title).toBe('Specific Report');
        });

        it('should throw error if report not found', async () => {
            mockQuery.exec.mockResolvedValue(null);
            await expect(getReportByIdService(reportId)).rejects.toThrow('Report not found');
        });

        it('should throw error for an invalid report ID', async () => {
            await expect(getReportByIdService('invalid-id')).rejects.toThrow('Invalid report ID');
        });
    });


    //----------------------------------------------------------------
    // 11. Tests for updatePriorityAndApprovalStatus
    //----------------------------------------------------------------
    describe('updatePriorityAndApprovalStatus', () => {
        const reportId = new Types.ObjectId().toHexString();
        const mockUser = { _id: new Types.ObjectId(), phoneNumber: '+15551234567', toString: () => mockUser._id.toHexString() };
        const mockReport = { user: mockUser, save: jest.fn().mockResolvedValue(true) };
        const mockQuery = { populate: jest.fn().mockResolvedValue(mockReport) };
        beforeEach(() => {
            (Report.findById as jest.Mock).mockReturnValue(mockQuery);
        });

        it('should throw error for invalid priority value', async () => {
            await expect(updatePriorityAndApprovalStatus(reportId, { priority: 'Urgent', approvalStatus: 1 }))
                .rejects.toThrow('Invalid priority value');
        });

        it('should throw error for invalid approval status value', async () => {
            await expect(updatePriorityAndApprovalStatus(reportId, { priority: 'High', approvalStatus: 5 }))
                .rejects.toThrow('Invalid approval status value');
        });

        it('should send a "Rejected" notification for status 2', async () => {
            await updatePriorityAndApprovalStatus(reportId, { priority: 'Low', approvalStatus: 2 });
            expect(notifyUser).toHaveBeenCalledWith(expect.objectContaining({ title: 'Report Rejected' }));
        });
    });

    //----------------------------------------------------------------
    // 12. Tests for voteOnReport
    //----------------------------------------------------------------
    describe('voteOnReport', () => {
        const reportId = new Types.ObjectId().toHexString();
        const userId = new Types.ObjectId().toHexString();
        const mockReport = {
            _id: reportId,
            votes: [] as { user: Types.ObjectId; direction: 'Up' | 'Down' }[],
            voteScore: 0,
            save: jest.fn(function () {
                this.voteScore = this.votes.reduce((acc: number, vote: any) => acc + (vote.direction === 'Up' ? 1 : -1), 0);
                return Promise.resolve(this);
            }),
        };

        beforeEach(() => {
            mockReport.votes = [];
            mockReport.voteScore = 0;
            (Report.findById as jest.Mock).mockResolvedValue(mockReport);
        });

        it('should add a new DOWN vote successfully', async () => {
            const result = await voteOnReport(reportId, { userId, direction: 'Down' });
            expect(result.voteScore).toBe(-1);
        });

        it('should throw error if report is not found', async () => {
            (Report.findById as jest.Mock).mockResolvedValue(null);
            await expect(voteOnReport(reportId, { userId, direction: 'Up' })).rejects.toThrow('Report not found');
        });

        it('should throw error for an invalid vote direction', async () => {
            await expect(voteOnReport(reportId, { userId, direction: 'Side' as any })).rejects.toThrow('Invalid vote direction');
        });
    });
});
