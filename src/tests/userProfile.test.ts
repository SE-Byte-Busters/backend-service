import mongoose, { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
    uploadProfileImageService,
    updateUserProfileService,
    updateUserPasswordService,
    getScoreAndRank,
    getUserProfile,
    getTopUsersByScore,
    addBadgeToUser,
} from '../services/userProfile.service'; // Adjust path as needed
import { User } from '../models';
import ScoreAndBadge from '../models/scoreAndBadge.model';
import { MinioBuckets, config, logger } from '../config';
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError, UnauthorizedError } from '../utils';

//================================================================
//==                         Mocks                              ==
//================================================================

// Mock Mongoose Models
jest.mock('../models/user.model');
jest.mock('../models/scoreAndBadge.model');

// Mock external utilities and services
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-for-user'),
}));

// Mock logger and Minio Client
jest.mock('../config', () => ({
    ...jest.requireActual('../config'),
    logger: { warn: jest.fn() },
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

// Helper to create a mock file object
const createMockFile = (originalname: string, buffer: Buffer): Express.Multer.File => ({
    fieldname: 'profile', originalname, encoding: '7bit', mimetype: 'image/png',
    size: buffer.length, buffer, stream: null as any, destination: '',
    filename: '', path: '',
});

//================================================================
//==                       Test Suite                           ==
//================================================================

describe('User Service', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    //----------------------------------------------------------------
    // 1. Tests for uploadProfileImageService
    //----------------------------------------------------------------
    describe('uploadProfileImageService', () => {
        const userId = new Types.ObjectId().toHexString();
        const mockFile = createMockFile('profile.png', Buffer.from('fake-image'));

        it('should upload an image and update user profile', async () => {
            const mockUser = { _id: userId, profileKey: null, save: jest.fn().mockResolvedValue(true) };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);

            const result = await uploadProfileImageService(userId, mockFile);

            expect(MinioBuckets.profile.client.putObject).toHaveBeenCalled();
            expect(mockUser.save).toHaveBeenCalled();
            expect(result.profileUrl).toContain('mock-uuid-for-user.png');
        });

        it('should remove an old image if it exists', async () => {
            const mockUser = { _id: userId, profileKey: 'profiles/old.png', save: jest.fn().mockResolvedValue(true) };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);

            await uploadProfileImageService(userId, mockFile);

            expect(MinioBuckets.profile.client.removeObject).toHaveBeenCalledWith('profile-bucket', 'profiles/old.png');
        });

        it('should throw ForbiddenError if user is not found', async () => {
            (User.findById as jest.Mock).mockResolvedValue(null);
            await expect(uploadProfileImageService(userId, mockFile)).rejects.toThrow(ForbiddenError);
        });

        it('should throw BadRequestError if no file is uploaded', async () => {
            // Pass null or undefined for the file parameter
            await expect(uploadProfileImageService(userId, null as any)).rejects.toThrow(BadRequestError);
        });
    });

    //----------------------------------------------------------------
    // 2. Tests for updateUserProfileService
    //----------------------------------------------------------------
    describe('updateUserProfileService', () => {
        const userId = new Types.ObjectId().toHexString();

        it('should update user profile details successfully', async () => {
            const mockUser = { _id: userId, username: 'oldName', email: 'old@test.com', save: jest.fn().mockResolvedValue(true) };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);
            (User.exists as jest.Mock).mockResolvedValue(null);
            (ScoreAndBadge.findOne as jest.Mock).mockResolvedValue(null);

            const result = await updateUserProfileService({ _id: userId, firstName: 'New', username: 'newName' });

            expect(mockUser.save).toHaveBeenCalled();
            expect(result.firstName).toBe('New');
        });

        it('should update username in ScoreAndBadge model if it exists', async () => {
            const mockUser = { _id: userId, username: 'oldName', save: jest.fn().mockResolvedValue(true) };
            const mockScore = { username: 'oldName', save: jest.fn().mockResolvedValue(true) };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);
            (ScoreAndBadge.findOne as jest.Mock).mockResolvedValue(mockScore);

            await updateUserProfileService({ _id: userId, username: 'newName' });

            expect(mockScore.save).toHaveBeenCalled();
            expect(mockScore.username).toBe('newName');
        });

        it('should throw NotFoundError if user does not exist', async () => {
            (User.findById as jest.Mock).mockResolvedValue(null);
            await expect(updateUserProfileService({ _id: userId, username: 'newName' })).rejects.toThrow(NotFoundError);
        });

        it('should throw ConflictError if email is already taken', async () => {
            const mockUser = { _id: userId, email: 'original@test.com', save: jest.fn() };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);
            (User.exists as jest.Mock).mockResolvedValue({ _id: 'anotherUserId' }); // Simulate email exists

            await expect(updateUserProfileService({ _id: userId, email: 'taken@test.com' })).rejects.toThrow(ConflictError);
        });
    });

    //----------------------------------------------------------------
    // 3. Tests for updateUserPasswordService
    //----------------------------------------------------------------
    describe('updateUserPasswordService', () => {
        const userId = new Types.ObjectId().toHexString();

        it('should update user password successfully', async () => {
            const mockUser = {
                comparePassword: jest.fn().mockResolvedValue(true),
                hashPassword: jest.fn().mockResolvedValue('newHashedPassword'),
                save: jest.fn().mockResolvedValue(true),
            };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);

            await updateUserPasswordService({ _id: userId, oldPassword: 'old', newPassword: 'new' });

            expect(mockUser.comparePassword).toHaveBeenCalledWith('old');
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should throw UnauthorizedError for incorrect old password', async () => {
            const mockUser = { comparePassword: jest.fn().mockResolvedValue(false) };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);
            await expect(updateUserPasswordService({ _id: userId, oldPassword: 'wrong', newPassword: 'new' })).rejects.toThrow(UnauthorizedError);
        });

        it('should throw NotFoundError if user is not found', async () => {
            (User.findById as jest.Mock).mockResolvedValue(null);
            await expect(updateUserPasswordService({ _id: userId, oldPassword: 'old', newPassword: 'new' })).rejects.toThrow(NotFoundError);
        });
    });

    //----------------------------------------------------------------
    // 4. Tests for getScoreAndRank
    //----------------------------------------------------------------
    describe('getScoreAndRank', () => {
        const userId = new Types.ObjectId().toHexString();

        it('should return user score and rank correctly', async () => {
            const mockScore = { user: userId, score: 150, username: 'test' };
            (ScoreAndBadge.findOne as jest.Mock).mockResolvedValue(mockScore);
            (ScoreAndBadge.countDocuments as jest.Mock).mockResolvedValue(5); // 5 users have a higher score

            const result = await getScoreAndRank(userId);

            expect(result.score).toBe(150);
            expect(result.rank).toBe(6);
        });

        it('should return rank 1 if user has the highest score', async () => {
            const mockScore = { user: userId, score: 200, username: 'top_user' };
            (ScoreAndBadge.findOne as jest.Mock).mockResolvedValue(mockScore);
            (ScoreAndBadge.countDocuments as jest.Mock).mockResolvedValue(0); // No users have a higher score

            const result = await getScoreAndRank(userId);

            expect(result.rank).toBe(1);
        });

        it('should throw NotFoundError if no score record is found for the user', async () => {
            (ScoreAndBadge.findOne as jest.Mock).mockResolvedValue(null);
            await expect(getScoreAndRank(userId)).rejects.toThrow(NotFoundError);
        });
    });

    //----------------------------------------------------------------
    // 5. Tests for getUserProfile
    //----------------------------------------------------------------
    describe('getUserProfile', () => {
        const userId = new Types.ObjectId().toHexString();

        it('should return a user profile successfully', async () => {
            const mockUser = { _id: userId, username: 'test' };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);

            const result = await getUserProfile(userId);

            expect(result).toEqual(mockUser);
        });

        it('should throw ForbiddenError if user is not found', async () => {
            (User.findById as jest.Mock).mockResolvedValue(null);
            await expect(getUserProfile(userId)).rejects.toThrow(ForbiddenError);
        });

        it('should return the full user object with all fields', async () => {
            const fullMockUser = { _id: userId, username: 'test', email: 'test@test.com', firstName: 'Test' };
            (User.findById as jest.Mock).mockResolvedValue(fullMockUser);

            const result = await getUserProfile(userId);

            expect(result).toEqual(fullMockUser);
        });
    });

    //----------------------------------------------------------------
    // 6. Tests for getTopUsersByScore
    //----------------------------------------------------------------
    describe('getTopUsersByScore', () => {
        it('should return top users sorted by score', async () => {
            const mockUsers = [{ username: 'user1', totalScore: 100 }, { username: 'user2', totalScore: 90 }];
            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockUsers),
            };
            (User.find as jest.Mock).mockReturnValue(mockQuery);

            const result = await getTopUsersByScore(2);

            expect(mockQuery.sort).toHaveBeenCalledWith({ totalScore: -1 });
            expect(mockQuery.limit).toHaveBeenCalledWith(2);
            expect(result).toEqual(mockUsers);
        });

        it('should return an empty array if no users are found', async () => {
            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
            };
            (User.find as jest.Mock).mockReturnValue(mockQuery);

            const result = await getTopUsersByScore(5);

            expect(result).toEqual([]);
        });

        it('should throw an error if limit is not a positive number', async () => {
            await expect(getTopUsersByScore(0)).rejects.toThrow('Limit must be a positive number');
            await expect(getTopUsersByScore(-1)).rejects.toThrow('Limit must be a positive number');
        });
    });

    //----------------------------------------------------------------
    // 7. Tests for addBadgeToUser
    //----------------------------------------------------------------
    describe('addBadgeToUser', () => {
        const userId = new Types.ObjectId().toHexString();

        it('should add a new badge to a user', async () => {
            const mockUser = { _id: userId, badges: [], save: jest.fn().mockResolvedValue(true) };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);

            const result = await addBadgeToUser(userId, 'new_badge');

            expect(mockUser.save).toHaveBeenCalled();
            expect(result).toContain('new_badge');
        });

        it('should not add a duplicate badge', async () => {
            const mockUser = { _id: userId, badges: ['existing_badge'], save: jest.fn() };
            (User.findById as jest.Mock).mockResolvedValue(mockUser);

            await addBadgeToUser(userId, 'existing_badge');

            expect(mockUser.save).not.toHaveBeenCalled();
        });

        it('should throw an error if the user is not found', async () => {
            (User.findById as jest.Mock).mockResolvedValue(null);
            await expect(addBadgeToUser(userId, 'any_badge')).rejects.toThrow('User not found');
        });
    });
});
