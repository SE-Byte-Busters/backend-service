// src/tests/admin.service.test.ts

import {
    uploadAdminProfileImageService,
    updateAdminProfileService,
    updateAdminPasswordService,
    adminGetPendingReportService,
    adminGetStatedReportService,
    addScoreToReport,
    getUserAdminProfile,
} from '../services/admin.service'; // Adjust the import path as needed

import { Admin, Report, User } from '../models';
import { MinioBuckets, logger, config } from '../config';
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError, UnauthorizedError } from '../utils';

// --- MOCKS SETUP ---

// Mocking the entire models module
// This prevents any real database calls from being made.
jest.mock('../models', () => ({
    Admin: {
        findById: jest.fn(),
        exists: jest.fn(),
    },
    Report: {
        findById: jest.fn(),
        find: jest.fn(),
        countDocuments: jest.fn(),
    },
    User: {
        findByIdAndUpdate: jest.fn(),
    },
}));

// Mocking external dependencies and configurations
jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-for-testing',
}));

jest.mock('../config', () => ({
    MinioBuckets: {
        profile: {
            client: {
                putObject: jest.fn(() => Promise.resolve()),
                removeObject: jest.fn(() => Promise.resolve()),
            },
            bucket: 'mock-profile-bucket',
        },
    },
    logger: {
        warn: jest.fn(),
    },
    config: {
        minioConfig: {
            useSSL: true,
            endpoint: 'mock-minio.example.com',
            port: 9000,
        },
    },
}));

// Mocking custom error classes to allow for `toThrow` checks
jest.mock('../utils', () => ({
    BadRequestError: class extends Error { constructor(m: string) { super(m); this.name = 'BadRequestError'; } },
    ForbiddenError: class extends Error { constructor(m: string) { super(m); this.name = 'ForbiddenError'; } },
    NotFoundError: class extends Error { constructor(m: string) { super(m); this.name = 'NotFoundError'; } },
    ConflictError: class extends Error { constructor(m: string) { super(m); this.name = 'ConflictError'; } },
    UnauthorizedError: class extends Error { constructor(m: string) { super(m); this.name = 'UnauthorizedError'; } },
}));


// --- TYPE CASTING MOCKS ---
// This provides type safety and autocompletion for our mocked objects.
const mockedAdmin = Admin as jest.Mocked<typeof Admin>;
const mockedReport = Report as jest.Mocked<typeof Report>;
const mockedUser = User as jest.Mocked<typeof User>;
const mockedMinioClient = MinioBuckets.profile.client;


// --- TEST SUITE ---

describe('Admin Services', () => {

    // Reset mocks before each test to ensure test isolation
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- Tests for uploadAdminProfileImageService ---
    describe('uploadAdminProfileImageService', () => {
        const mockFile = {
            originalname: 'test.jpg',
            buffer: Buffer.from('fake-image-data'),
        } as Express.Multer.File;

        it('should upload a new profile image and return the URL', async () => {
            const mockAdminInstance = {
                profileUrl: '',
                profileKey: '',
                save: jest.fn().mockResolvedValue(this),
            };
            mockedAdmin.findById.mockResolvedValue(mockAdminInstance as any);

            const result = await uploadAdminProfileImageService('adminId1', mockFile);

            expect(mockedAdmin.findById).toHaveBeenCalledWith('adminId1');
            expect(mockedMinioClient.putObject).toHaveBeenCalled();
            expect(mockAdminInstance.save).toHaveBeenCalled();
            expect(mockAdminInstance.profileKey).toBe('profiles/mock-uuid-for-testing.jpg');
            expect(result.profileUrl).toContain('mock-profile-bucket/profiles/mock-uuid-for-testing.jpg');
        });

        it('should remove the old image if one exists', async () => {
            const mockAdminInstance = {
                profileUrl: 'old-url',
                profileKey: 'old-key',
                save: jest.fn().mockResolvedValue(this),
            };
            mockedAdmin.findById.mockResolvedValue(mockAdminInstance as any);

            await uploadAdminProfileImageService('adminId1', mockFile);

            expect(mockedMinioClient.removeObject).toHaveBeenCalledWith('mock-profile-bucket', 'old-key');
            expect(mockAdminInstance.save).toHaveBeenCalled();
        });

        it('should throw BadRequestError if no file is provided', async () => {
            await expect(uploadAdminProfileImageService('adminId1', null as any)).rejects.toThrow(BadRequestError);
        });

        it('should throw ForbiddenError if admin is not found', async () => {
            mockedAdmin.findById.mockResolvedValue(null);
            await expect(uploadAdminProfileImageService('adminId1', mockFile)).rejects.toThrow(ForbiddenError);
        });
    });

    // --- Tests for updateAdminProfileService ---
    describe('updateAdminProfileService', () => {
        it('should update admin profile successfully', async () => {
            const mockAdminInstance = {
                _id: 'adminId1',
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john@example.com',
                save: jest.fn().mockResolvedValue(this),
            };
            mockedAdmin.findById.mockResolvedValue(mockAdminInstance as any);
            mockedAdmin.exists.mockResolvedValue(null); // No email conflict

            const updates = {
                _id: 'adminId1',
                firstName: 'Jane',
                email: 'jane@example.com',
            };
            const result = await updateAdminProfileService(updates);

            expect(mockedAdmin.findById).toHaveBeenCalledWith('adminId1');
            expect(mockedAdmin.exists).toHaveBeenCalledWith({ email: 'jane@example.com' });
            expect(mockAdminInstance.save).toHaveBeenCalled();
            expect(result.firstName).toBe('Jane');
            expect(result.email).toBe('jane@example.com');
        });

        it('should throw NotFoundError if admin not found', async () => {
            mockedAdmin.findById.mockResolvedValue(null);
            await expect(updateAdminProfileService({ _id: 'unknownId' })).rejects.toThrow(NotFoundError);
        });

        it('should throw ConflictError if email is already taken', async () => {
            const mockAdminInstance = { email: 'john@example.com', save: jest.fn() };
            mockedAdmin.findById.mockResolvedValue(mockAdminInstance as any);
            mockedAdmin.exists.mockResolvedValue({ _id: 'anotherAdmin' }); // Email exists

            const updates = { _id: 'adminId1', email: 'taken@example.com' };
            await expect(updateAdminProfileService(updates)).rejects.toThrow(ConflictError);
        });
    });

    // --- Tests for updateAdminPasswordService ---
    describe('updateAdminPasswordService', () => {
        const mockAdminInstance = {
            comparePassword: jest.fn(),
            hashPassword: jest.fn().mockResolvedValue('newHashedPassword'),
            save: jest.fn().mockResolvedValue(true),
            password: 'oldHashedPassword',
        };

        it('should update password when old password is correct', async () => {
            mockAdminInstance.comparePassword.mockResolvedValue(true);
            mockedAdmin.findById.mockResolvedValue(mockAdminInstance as any);

            const params = { _id: 'adminId1', oldPassword: 'correctOldPassword', newPassword: 'newPassword123' };
            await updateAdminPasswordService(params);

            expect(mockAdminInstance.comparePassword).toHaveBeenCalledWith('correctOldPassword');
            expect(mockAdminInstance.hashPassword).toHaveBeenCalledWith('newPassword123');
            expect(mockAdminInstance.password).toBe('newHashedPassword');
            expect(mockAdminInstance.save).toHaveBeenCalled();
        });

        it('should throw UnauthorizedError if old password is incorrect', async () => {
            mockAdminInstance.comparePassword.mockResolvedValue(false);
            mockedAdmin.findById.mockResolvedValue(mockAdminInstance as any);

            const params = { _id: 'adminId1', oldPassword: 'wrongOldPassword', newPassword: 'newPassword123' };
            await expect(updateAdminPasswordService(params)).rejects.toThrow(UnauthorizedError);
        });

        it('should throw NotFoundError if admin not found', async () => {
            mockedAdmin.findById.mockResolvedValue(null);
            const params = { _id: 'unknownId', oldPassword: 'p', newPassword: 'p' };
            await expect(updateAdminPasswordService(params)).rejects.toThrow(NotFoundError);
        });
    });

    // --- Tests for Report Retrieval Services ---
    describe('Report Retrieval Services', () => {
        it('adminGetPendingReportService should fetch pending reports sorted by oldest', async () => {
            const mockReports = [{ id: 1 }, { id: 2 }];
            const queryMock = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockReports),
            };
            mockedReport.find.mockReturnValue(queryMock as any);

            // **FIX**: Mock countDocuments to return an object with an exec method.
            mockedReport.countDocuments.mockReturnValue({
                exec: jest.fn().mockResolvedValue(2),
            } as any);

            const result = await adminGetPendingReportService(1, 10, 'oldest');

            expect(mockedReport.find).toHaveBeenCalledWith({ approvalStatus: 0 });
            expect(queryMock.sort).toHaveBeenCalledWith({ createdAt: 1 });
            expect(result.reports).toEqual(mockReports);
            expect(result.total).toBe(2);
            expect(result.pages).toBe(1);
        });

        it('adminGetStatedReportService should fetch stated reports sorted by newest', async () => {
            const mockReports = [{ id: 3 }, { id: 4 }];
            const queryMock = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockReports),
            };
            mockedReport.find.mockReturnValue(queryMock as any);

            // **FIX**: Mock countDocuments to return an object with an exec method.
            mockedReport.countDocuments.mockReturnValue({
                exec: jest.fn().mockResolvedValue(2),
            } as any);

            const result = await adminGetStatedReportService(1, 10, 'newest');

            expect(mockedReport.find).toHaveBeenCalledWith({ approvalStatus: { $in: [1, 2] } });
            expect(queryMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(result.reports).toEqual(mockReports);
        });
    });

    // --- Tests for addScoreToReport ---
    describe('addScoreToReport', () => {
        it('should add a score and update user totalScore', async () => {
            const mockReportInstance = {
                user: 'userId1',
                score: 50, // previous score
                save: jest.fn().mockResolvedValue(this),
            };
            mockedReport.findById.mockResolvedValue(mockReportInstance as any);
            mockedUser.findByIdAndUpdate.mockResolvedValue({} as any);

            const newScore = 80;
            const scoreDifference = 30;
            await addScoreToReport('reportId1', newScore);

            expect(mockedReport.findById).toHaveBeenCalledWith('reportId1');
            expect(mockReportInstance.score).toBe(newScore);
            expect(mockReportInstance.save).toHaveBeenCalled();
            expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith('userId1', {
                $inc: { totalScore: scoreDifference },
            });
        });

        it('should throw BadRequestError for an invalid score', async () => {
            await expect(addScoreToReport('reportId1', 101)).rejects.toThrow(BadRequestError);
            await expect(addScoreToReport('reportId1', -1)).rejects.toThrow(BadRequestError);
        });

        it('should throw BadRequestError if report is not found', async () => {
            mockedReport.findById.mockResolvedValue(null);
            await expect(addScoreToReport('unknownReportId', 50)).rejects.toThrow(BadRequestError);
        });
    });

    // --- Tests for getUserAdminProfile ---
    describe('getUserAdminProfile', () => {
        it('should return the admin profile if found', async () => {
            const adminProfile = { _id: 'adminId1', name: 'Test Admin' };
            mockedAdmin.findById.mockResolvedValue(adminProfile as any);

            const result = await getUserAdminProfile('adminId1');

            expect(result).toEqual(adminProfile);
            expect(mockedAdmin.findById).toHaveBeenCalledWith('adminId1');
        });

        it('should throw ForbiddenError if admin is not found', async () => {
            mockedAdmin.findById.mockResolvedValue(null);
            await expect(getUserAdminProfile('unknownId')).rejects.toThrow(ForbiddenError);
        });
    });

});
