// src/tests/report.service.test.ts

import mongoose, { Types } from 'mongoose';
import {
    createReportWithImages,
    getUserReports,
    searchReportsInMapArea,
    addCommentService,
    getReportCommentsService,
    addReqSolveReportService,
    getReqSolvesReportService,
    setReportResolvedByService,
    getReportByIdService,
    updatePriorityAndApprovalStatus,
    voteOnReport,
} from '../services/report.service'; // Adjust path as needed
import { Report, User } from '../models';
import { MinioBuckets, config } from '../config';
import { notif } from '../utils/notif.utils';
import { notifyUser } from '../services/notification.service';
import { BadRequestError, NotFoundError } from '../utils';

// --- MOCKS SETUP ---

// Mocking Mongoose models
jest.mock('../models', () => ({
    Report: {
        create: jest.fn(),
        findById: jest.fn(),
        find: jest.fn(),
        countDocuments: jest.fn(),
    },
    User: {
        // Mock any User model functions if needed
    },
}));

// Mocking external dependencies
jest.mock('../config', () => ({
    MinioBuckets: {
        reports: {
            client: {
                putObject: jest.fn().mockResolvedValue({}),
                removeObject: jest.fn().mockResolvedValue({}),
            },
            bucket: 'mock-reports-bucket',
        },
    },
    config: {
        minioConfig: {
            useSSL: true,
            endpoint: 'mock-minio.example.com',
            port: 9000,
        },
    },
}));

jest.mock('uuid', () => ({
    v4: () => 'mock-uuid',
}));

jest.mock('../utils/notif.utils', () => ({
    notif: jest.fn().mockResolvedValue(null),
}));

jest.mock('../services/notification.service', () => ({
    notifyUser: jest.fn().mockResolvedValue(null),
}));

jest.mock('../utils', () => ({
    BadRequestError: class extends Error { constructor(m: string) { super(m); this.name = 'BadRequestError'; } },
    NotFoundError: class extends Error { constructor(m: string) { super(m); this.name = 'NotFoundError'; } },
}));


// --- TYPE CASTING MOCKS ---
const mockedReport = Report as jest.Mocked<typeof Report>;
const mockedMinioClient = MinioBuckets.reports.client;
const mockedNotifyUser = notifyUser as jest.Mock;
const mockedNotif = notif as jest.Mock;


// --- TEST SUITE ---
describe('Report Services', () => {
    const mockUserId = new Types.ObjectId().toHexString();
    const mockReportId = new Types.ObjectId().toHexString();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    // --- Tests for createReportWithImages ---
    describe('createReportWithImages', () => {
        const mockFile = { originalname: 'test.png', buffer: Buffer.from('fake-data') } as Express.Multer.File;
        const validParams = {
            user: mockUserId,
            title: 'Test Report',
            description: 'A test description',
            approximatePosition: 'Near the park',
            location: { type: 'Point' as const, coordinates: [10, 20] },
            images: [mockFile],
        };

        it('should create a report with images successfully', async () => {
            mockedReport.create.mockResolvedValue({ _id: mockReportId, ...validParams } as any);
            const result = await createReportWithImages(validParams);
            expect(mockedMinioClient.putObject).toHaveBeenCalledTimes(1);
            expect(mockedReport.create).toHaveBeenCalled();
            expect(result).toHaveProperty('_id');
        });

        it('should throw BadRequestError if no images are provided', async () => {
            await expect(createReportWithImages({ ...validParams, images: [] })).rejects.toThrow(BadRequestError);
        });

        it('should throw BadRequestError for invalid point coordinates', async () => {
            const invalidLocation = { type: 'Point' as const, coordinates: [10] };
            await expect(createReportWithImages({ ...validParams, location: invalidLocation })).rejects.toThrow(BadRequestError);
        });

        it('should cleanup uploaded images on db error', async () => {
            mockedReport.create.mockRejectedValue(new Error('DB failure'));
            await expect(createReportWithImages(validParams)).rejects.toThrow('DB failure');
            expect(mockedMinioClient.removeObject).toHaveBeenCalledTimes(1);
        });
    });

    // --- Tests for getUserReports ---
    describe('getUserReports', () => {
        it('should fetch reports for a user with default sorting and pagination', async () => {
            const queryMock = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            };
            mockedReport.find.mockReturnValue(queryMock as any);
            mockedReport.countDocuments.mockResolvedValue(0);

            await getUserReports({ userId: mockUserId });
            expect(mockedReport.find).toHaveBeenCalledWith({ user: mockUserId });
            expect(queryMock.sort).toHaveBeenCalledWith({ createdAt: -1 }); // Default is newest
            expect(queryMock.skip).toHaveBeenCalledWith(0);
            expect(queryMock.limit).toHaveBeenCalledWith(10);
        });
    });

    // --- Tests for searchReportsInMapArea ---
    describe('searchReportsInMapArea', () => {
        it('should search for reports within a given map area', async () => {
            const queryMock = {
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mockedReport.find.mockReturnValue(queryMock as any);
            const bounds = {
                ne: { lat: 40, lng: 40 },
                sw: { lat: 30, lng: 30 },
            };
            await searchReportsInMapArea({ bounds });
            expect(mockedReport.find).toHaveBeenCalledWith(expect.objectContaining({
                'location.coordinates': { $geoWithin: { $geometry: expect.any(Object) } }
            }));
        });
    });

    // --- Tests for addCommentService ---
    describe('addCommentService', () => {
        it('should add a comment to a report', async () => {
            // **FIX**: Restructured mock to avoid using 'this' and removed unnecessary polyfill.
            const mockReportInstance = {
                _id: mockReportId,
                comments: [] as any[],
                save: jest.fn(),
            };
            mockReportInstance.save.mockResolvedValue(mockReportInstance); // Make save resolve with the object itself.
            mockedReport.findById.mockResolvedValue(mockReportInstance as any);

            const result = await addCommentService(mockReportId, mockUserId, 'This is a test comment');

            // After the service call, the comments array on our mock object should have been modified.
            expect(mockReportInstance.comments.length).toBe(1);
            expect(mockReportInstance.comments[0].text).toBe('This is a test comment');
            expect(mockReportInstance.save).toHaveBeenCalled();
            expect(result.message).toBe('Comment added successfully');
            expect(result.comment?.text).toBe('This is a test comment');
        });

        it('should throw BadRequestError if report not found', async () => {
            mockedReport.findById.mockResolvedValue(null);
            await expect(addCommentService(mockReportId, mockUserId, 'test')).rejects.toThrow(BadRequestError);
        });
    });

    // --- Tests for getReportCommentsService ---
    describe('getReportCommentsService', () => {
        it('should return comments for a report', async () => {
            const mockComment = {
                _id: new Types.ObjectId(),
                user: { _id: new Types.ObjectId(), username: 'testuser' },
                text: 'A comment',
                date: new Date()
            };
            const mockReportWithComments = {
                comments: [mockComment]
            };
            const queryMock = {
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockReportWithComments)
            };
            mockedReport.findById.mockReturnValue(queryMock as any);
            const result = await getReportCommentsService(mockReportId);

            expect(result.length).toBe(1);
            expect(result[0].user.username).toBe('testuser');
        });
    });

    // --- Tests for setReportResolvedByService ---
    describe('setReportResolvedByService', () => {
        it('should mark a report as resolved', async () => {
            const mockReportInstance = {
                resolvedBy: undefined,
                resolvedAt: undefined,
                save: jest.fn().mockResolvedValue(true)
            };
            mockedReport.findById.mockResolvedValue(mockReportInstance as any);
            await setReportResolvedByService(mockReportId, mockUserId);

            expect(mockReportInstance.resolvedBy).toEqual(new Types.ObjectId(mockUserId));
            expect(mockReportInstance.resolvedAt).toBeInstanceOf(Date);
            expect(mockReportInstance.save).toHaveBeenCalled();
        });
    });

    // --- Tests for updatePriorityAndApprovalStatus ---
    describe('updatePriorityAndApprovalStatus', () => {
        it('should update status and send notifications', async () => {
            const mockUser = { _id: mockUserId, phoneNumber: '+989123456789', toString: () => mockUserId };
            const mockReportInstance = {
                priority: 'Low',
                approvalStatus: 0,
                user: mockUser,
                save: jest.fn().mockResolvedValue(true),
            };
            mockedReport.findById.mockReturnValue({ populate: () => mockReportInstance } as any);

            const result = await updatePriorityAndApprovalStatus(mockReportId, { priority: 'High', approvalStatus: 1 });

            expect(mockReportInstance.priority).toBe('High');
            expect(mockReportInstance.approvalStatus).toBe(1);
            expect(mockReportInstance.save).toHaveBeenCalled();
            expect(mockedNotifyUser).toHaveBeenCalled();
            expect(mockedNotif).toHaveBeenCalled();
            expect(result.message).toBe('Priority and approval status updated successfully');
        });

        it('should throw BadRequestError for invalid priority', async () => {
            await expect(updatePriorityAndApprovalStatus(mockReportId, { priority: 'Invalid', approvalStatus: 1 })).rejects.toThrow(BadRequestError);
        });
    });

    // --- Tests for voteOnReport ---
    describe('voteOnReport', () => {
        it('should add a new upvote', async () => {
            const mockReportInstance = {
                votes: [] as any[],
                voteScore: 0,
                save: jest.fn().mockResolvedValue(true),
            };
            mockedReport.findById.mockResolvedValue(mockReportInstance as any);

            const result = await voteOnReport(mockReportId, { userId: mockUserId, direction: 'Up' });

            expect(result.voteScore).toBe(1);
            expect(result.voteUpScore).toBe(1);
            expect(result.voteDownScore).toBe(0);
            expect(mockReportInstance.votes.length).toBe(1);
            expect(mockReportInstance.save).toHaveBeenCalled();
        });

        it('should change an existing vote from Down to Up', async () => {
            const mockReportInstance = {
                votes: [{ user: new Types.ObjectId(mockUserId), direction: 'Down' }],
                voteScore: -1,
                save: jest.fn().mockResolvedValue(true),
            };
            mockedReport.findById.mockResolvedValue(mockReportInstance as any);

            const result = await voteOnReport(mockReportId, { userId: mockUserId, direction: 'Up' });

            expect(result.voteScore).toBe(1);
            expect(result.voteUpScore).toBe(1);
            expect(result.voteDownScore).toBe(0);
            expect(mockReportInstance.votes[0].direction).toBe('Up');
            expect(mockReportInstance.save).toHaveBeenCalled();
        });
    });

    // --- Tests for getReportByIdService ---
    describe('getReportByIdService', () => {
        it('should return a report by its ID', async () => {
            const mockReportData = { _id: mockReportId, title: 'Found Report' };
            const queryMock = {
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockReportData),
            };
            mockedReport.findById.mockReturnValue(queryMock as any);
            const result = await getReportByIdService(mockReportId);

            expect(mockedReport.findById).toHaveBeenCalledWith(mockReportId);
            expect(result).toEqual(mockReportData);
        });

        it('should throw BadRequestError if report is not found', async () => {
            const queryMock = {
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null),
            };
            mockedReport.findById.mockReturnValue(queryMock as any);
            await expect(getReportByIdService(mockReportId)).rejects.toThrow(BadRequestError);
        });
    });
});
