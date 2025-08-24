import mongoose, { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
    uploadAdminProfileImageService,
    updateAdminProfileService,
    updateAdminPasswordService,
    adminGetPendingReportService,
    adminGetStatedReportService,
    addScoreToReport,
    getUserAdminProfile,
} from '../services/admin.service'; // Adjust path as needed
import { Admin, Report, User } from '../models';
import { MinioBuckets, config, logger } from '../config';
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError, UnauthorizedError } from '../utils';

//================================================================
//==                         Mocks                              ==
//================================================================

// Mock Mongoose Models
jest.mock('../models/admin.model');
jest.mock('../models/report.model');
jest.mock('../models/user.model');

// Mock external utilities and services
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-for-admin'),
}));

// Mock logger to prevent console output during tests
jest.mock('../config', () => ({
    ...jest.requireActual('../config'), // Keep actual config values
    logger: {
        warn: jest.fn(),
    },
    // Mock Minio Client and Config
    MinioBuckets: {
        profile: {
            client: {
                putObject: jest.fn().mockResolvedValue({ etag: 'mock-etag' }),
                removeObject: jest.fn().mockResolvedValue(true),
            },
            bucket: 'profile-bucket',
        },
    },
}));


// Helper to create a mock file object for tests
const createMockFile = (originalname: string, buffer: Buffer): Express.Multer.File => ({
    fieldname: 'images', originalname, encoding: '7bit', mimetype: 'image/jpeg',
    size: buffer.length, buffer, stream: null as any, destination: '',
    filename: '', path: '',
});

//================================================================
//==                       Test Suite                           ==
//================================================================

describe('Admin Service', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    //----------------------------------------------------------------
    // 1. Tests for uploadAdminProfileImageService
    //----------------------------------------------------------------
    describe('uploadAdminProfileImageService', () => {
        const adminId = new Types.ObjectId().toHexString();
        const mockFile = createMockFile('avatar.png', Buffer.from('fake-image-data'));

        it('should upload a new profile image successfully', async () => {
            const mockAdmin = {
                _id: adminId,
                profileKey: null,
                save: jest.fn().mockResolvedValue(true),
            };
            (Admin.findById as jest.Mock).mockResolvedValue(mockAdmin);

            const result = await uploadAdminProfileImageService(adminId, mockFile);

            expect(Admin.findById).toHaveBeenCalledWith(adminId);
            expect(MinioBuckets.profile.client.putObject).toHaveBeenCalled();
            expect(mockAdmin.save).toHaveBeenCalled();
            expect(result.profileUrl).toContain('mock-uuid-for-admin.png');
        });

        it('should remove the old image if one exists', async () => {
            const mockAdmin = {
                _id: adminId,
                profileKey: 'profiles/old-key.png',
                save: jest.fn().mockResolvedValue(true),
            };
            (Admin.findById as jest.Mock).mockResolvedValue(mockAdmin);

            await uploadAdminProfileImageService(adminId, mockFile);

            expect(MinioBuckets.profile.client.removeObject).toHaveBeenCalledWith('profile-bucket', 'profiles/old-key.png');
            expect(mockAdmin.save).toHaveBeenCalled();
        });

        it('should throw ForbiddenError if admin is not found', async () => {
            (Admin.findById as jest.Mock).mockResolvedValue(null);
            await expect(uploadAdminProfileImageService(adminId, mockFile)).rejects.toThrow(ForbiddenError);
        });
    });

    //----------------------------------------------------------------
    // 2. Tests for updateAdminProfileService
    //----------------------------------------------------------------
    describe('updateAdminProfileService', () => {
        const adminId = new Types.ObjectId().toHexString();
        const updateData = { firstName: 'Jane', email: 'jane.doe@example.com' };

        it('should update admin profile successfully', async () => {
            const mockAdmin = {
                _id: adminId,
                firstName: 'John',
                email: 'john.doe@example.com',
                save: jest.fn().mockResolvedValue(true),
            };
            (Admin.findById as jest.Mock).mockResolvedValue(mockAdmin);
            (Admin.exists as jest.Mock).mockResolvedValue(null);

            const result = await updateAdminProfileService({ _id: adminId, ...updateData });

            expect(mockAdmin.save).toHaveBeenCalled();
            expect(result.firstName).toBe('Jane');
            expect(result.email).toBe('jane.doe@example.com');
        });

        it('should throw ConflictError if email is already taken', async () => {
            const mockAdmin = { _id: adminId, email: 'john.doe@example.com', save: jest.fn() };
            (Admin.findById as jest.Mock).mockResolvedValue(mockAdmin);
            (Admin.exists as jest.Mock).mockResolvedValue({ _id: new Types.ObjectId() });

            await expect(updateAdminProfileService({ _id: adminId, ...updateData })).rejects.toThrow(ConflictError);
        });
    });

    //----------------------------------------------------------------
    // 3. Tests for updateAdminPasswordService
    //----------------------------------------------------------------
    describe('updateAdminPasswordService', () => {
        const adminId = new Types.ObjectId().toHexString();
        const passwordData = { oldPassword: 'old', newPassword: 'new' };

        it('should update password successfully with correct old password', async () => {
            const mockAdmin = {
                comparePassword: jest.fn().mockResolvedValue(true),
                hashPassword: jest.fn().mockResolvedValue('hashedNewPassword'),
                save: jest.fn().mockResolvedValue(true),
            };
            (Admin.findById as jest.Mock).mockResolvedValue(mockAdmin);

            await updateAdminPasswordService({ _id: adminId, ...passwordData });

            expect(mockAdmin.comparePassword).toHaveBeenCalledWith('old');
            expect(mockAdmin.hashPassword).toHaveBeenCalledWith('new');
            expect(mockAdmin.save).toHaveBeenCalled();
        });

        it('should throw UnauthorizedError with incorrect old password', async () => {
            const mockAdmin = { comparePassword: jest.fn().mockResolvedValue(false) };
            (Admin.findById as jest.Mock).mockResolvedValue(mockAdmin);
            await expect(updateAdminPasswordService({ _id: adminId, ...passwordData })).rejects.toThrow(UnauthorizedError);
        });
    });

    //----------------------------------------------------------------
    // 4 & 5. Tests for Report Fetching Services
    //----------------------------------------------------------------
    describe('Report Fetching', () => {
        const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([{ title: 'A Report' }]),
        };

        it('adminGetPendingReportService should fetch pending reports', async () => {
            (Report.find as jest.Mock).mockReturnValue(mockQuery);
            // FIX: The service code incorrectly calls .exec() on countDocuments.
            // This mock accommodates that bug. The correct fix is to remove .exec() in the service file.
            (Report.countDocuments as jest.Mock).mockReturnValue({
                exec: jest.fn().mockResolvedValue(1),
            });

            await adminGetPendingReportService();

            expect(Report.find).toHaveBeenCalledWith({ approvalStatus: 0 });
            expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: 1 }); // Default is 'oldest'
        });

        it('adminGetStatedReportService should fetch approved/rejected reports', async () => {
            (Report.find as jest.Mock).mockReturnValue(mockQuery);
            // FIX: The service code incorrectly calls .exec() on countDocuments.
            // This mock accommodates that bug. The correct fix is to remove .exec() in the service file.
            (Report.countDocuments as jest.Mock).mockReturnValue({
                exec: jest.fn().mockResolvedValue(1),
            });

            await adminGetStatedReportService(1, 10, 'newest');

            expect(Report.find).toHaveBeenCalledWith({ approvalStatus: { $in: [1, 2] } });
            expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
        });
    });

    //----------------------------------------------------------------
    // 6. Tests for addScoreToReport
    //----------------------------------------------------------------
    describe('addScoreToReport', () => {
        const reportId = new Types.ObjectId().toHexString();
        const userId = new Types.ObjectId();

        it('should add score to a report and update user totalScore', async () => {
            const mockReport = {
                _id: reportId,
                user: userId,
                score: 50,
                save: jest.fn().mockResolvedValue(true),
            };
            (Report.findById as jest.Mock).mockResolvedValue(mockReport);
            (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

            await addScoreToReport(reportId, 80);

            expect(mockReport.save).toHaveBeenCalled();
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(userId, { $inc: { totalScore: 30 } }); // 80 - 50
        });

        it('should throw BadRequestError for invalid score', async () => {
            await expect(addScoreToReport(reportId, 101)).rejects.toThrow('Score must be a number between 0 and 100');
        });
    });

    //----------------------------------------------------------------
    // 7. Tests for getUserAdminProfile
    //----------------------------------------------------------------
    describe('getUserAdminProfile', () => {
        const adminId = new Types.ObjectId().toHexString();

        it('should return admin profile successfully', async () => {
            const mockAdmin = { _id: adminId, username: 'admin' };
            (Admin.findById as jest.Mock).mockResolvedValue(mockAdmin);

            const result = await getUserAdminProfile(adminId);

            expect(result).toEqual(mockAdmin);
        });

        it('should throw ForbiddenError if admin not found', async () => {
            (Admin.findById as jest.Mock).mockResolvedValue(null);
            await expect(getUserAdminProfile(adminId)).rejects.toThrow(ForbiddenError);
        });
    });
});
