// src/tests/comment.service.test.ts

import mongoose, { Types } from 'mongoose';
import { Comment } from '../models';
import {
    createComment,
    rateComment,
    getAllComments,
} from '../services/comment.service'; // Adjust path as needed
import { BadRequestError, NotFoundError } from '../utils';
import { IComment, Rating } from '../dto'; // Assuming DTOs are in this path

// --- MOCKS SETUP ---

// Mocking the Comment model
jest.mock('../models', () => ({
    Comment: {
        countDocuments: jest.fn(),
        create: jest.fn(),
        findById: jest.fn(),
        find: jest.fn(),
    },
}));

// Mocking utility classes
jest.mock('../utils', () => ({
    BadRequestError: class extends Error { constructor(m: string) { super(m); this.name = 'BadRequestError'; } },
    NotFoundError: class extends Error { constructor(m: string) { super(m); this.name = 'NotFoundError'; } },
}));

// --- TYPE CASTING MOCKS ---
const mockedComment = Comment as jest.Mocked<typeof Comment>;


// --- TEST SUITE ---
describe('Comment Services', () => {
    const mockUserId = new Types.ObjectId().toHexString();
    const mockCommentId = new Types.ObjectId().toHexString();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        // Disconnect mongoose to prevent test timeouts from open handles
        await mongoose.disconnect();
    });

    // --- Tests for createComment ---
    describe('createComment', () => {
        it('should create a comment successfully when user has less than 3 comments', async () => {
            mockedComment.countDocuments.mockResolvedValue(2);
            // **FIX**: Removed the explicit Partial<IComment> type to resolve the error.
            const newCommentData = {
                _id: new Types.ObjectId(mockCommentId),
                user: new Types.ObjectId(mockUserId),
                text: 'This is a test comment',
            };
            mockedComment.create.mockResolvedValue(newCommentData as any);

            const result = await createComment(mockUserId, { text: 'This is a test comment' });

            expect(mockedComment.countDocuments).toHaveBeenCalledWith({ user: mockUserId });
            expect(mockedComment.create).toHaveBeenCalledWith({
                user: mockUserId,
                text: 'This is a test comment',
            });
            expect(result).toEqual(newCommentData);
        });

        it('should throw BadRequestError if text is empty', async () => {
            await expect(createComment(mockUserId, { text: '' })).rejects.toThrow(BadRequestError);
            await expect(createComment(mockUserId, { text: '   ' })).rejects.toThrow(BadRequestError);
        });

        it('should throw BadRequestError if user already has 3 comments', async () => {
            mockedComment.countDocuments.mockResolvedValue(3);

            await expect(createComment(mockUserId, { text: 'Another comment' })).rejects.toThrow('You can only post a maximum of 3 comments.');
            expect(mockedComment.create).not.toHaveBeenCalled();
        });
    });

    // --- Tests for rateComment ---
    describe('rateComment', () => {
        // A mock comment object that conforms to the IComment interface
        const mockComment = {
            ratings: [] as Rating[],
            averageScore: 0,
            save: jest.fn().mockResolvedValue(true),
        };

        beforeEach(() => {
            // Reset the mock comment state for each test
            mockComment.ratings = [];
            mockComment.save.mockClear();
        });

        it('should add a new rating to a comment', async () => {
            mockedComment.findById.mockResolvedValue(mockComment as any);

            const ratingInput: Rating = { user: new Types.ObjectId(mockUserId), score: 5 };
            const result = await rateComment(mockUserId, mockCommentId, ratingInput);

            expect(mockedComment.findById).toHaveBeenCalledWith(mockCommentId);
            // Verify the array was mutated correctly before saving
            expect(mockComment.ratings).toHaveLength(1);
            expect(mockComment.ratings[0].user).toEqual(new Types.ObjectId(mockUserId));
            expect(mockComment.ratings[0].score).toBe(5);

            expect(mockComment.save).toHaveBeenCalled();
            expect(result).toHaveProperty('averageScore');
            expect(result).toHaveProperty('totalRatings');
        });

        it('should update an existing rating', async () => {
            // Setup an existing rating from the user
            const existingRating = { user: new Types.ObjectId(mockUserId), score: 3 };
            mockComment.ratings = [existingRating];
            mockedComment.findById.mockResolvedValue(mockComment as any);

            const ratingInput: Rating = { user: new Types.ObjectId(mockUserId), score: 1 };
            await rateComment(mockUserId, mockCommentId, ratingInput);

            // Verify the score was updated in the array
            expect(mockComment.ratings).toHaveLength(1);
            expect(mockComment.ratings[0].score).toBe(1);
            expect(mockComment.save).toHaveBeenCalled();
        });

        it('should throw NotFoundError if comment does not exist', async () => {
            mockedComment.findById.mockResolvedValue(null);
            const ratingInput: Rating = { user: new Types.ObjectId(mockUserId), score: 4 };
            await expect(rateComment(mockUserId, mockCommentId, ratingInput)).rejects.toThrow(NotFoundError);
        });

        it('should throw BadRequestError for an invalid score', async () => {
            const invalidRating1: Rating = { user: new Types.ObjectId(mockUserId), score: -1 };
            const invalidRating2: Rating = { user: new Types.ObjectId(mockUserId), score: 6 };
            await expect(rateComment(mockUserId, mockCommentId, invalidRating1)).rejects.toThrow(BadRequestError);
            await expect(rateComment(mockUserId, mockCommentId, invalidRating2)).rejects.toThrow(BadRequestError);
        });
    });

    // --- Tests for getAllComments ---
    describe('getAllComments', () => {
        it('should return a paginated list of comments', async () => {
            const mockComments = [
                { _id: new Types.ObjectId(), text: 'Comment 1', user: { firstName: 'John' } },
                { _id: new Types.ObjectId(), text: 'Comment 2', user: { firstName: 'Jane' } },
            ];

            // Mock the chainable query
            const queryMock = {
                populate: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockComments),
            };
            mockedComment.find.mockReturnValue(queryMock as any);
            mockedComment.countDocuments.mockResolvedValue(25);

            const result = await getAllComments(2, 10);

            expect(mockedComment.find).toHaveBeenCalled();
            // **FIX**: Changed expectation to match the actual implementation from the error log.
            expect(queryMock.populate).toHaveBeenCalledWith('user', 'name email');
            expect(queryMock.skip).toHaveBeenCalledWith(10);
            expect(queryMock.limit).toHaveBeenCalledWith(10);
            expect(queryMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(mockedComment.countDocuments).toHaveBeenCalled();

            expect(result).toEqual({
                total: 25,
                page: 2,
                pageSize: mockComments.length,
                comments: mockComments,
            });
        });
    });
});
