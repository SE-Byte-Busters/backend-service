import mongoose, { Types } from 'mongoose';
import {
    createComment,
    rateComment,
    getAllComments,
} from '../services/comment.service'; // Adjust path as needed
import { Comment } from '../models';
import { BadRequestError, NotFoundError } from '../utils';
import { Rating } from '../dto';

//================================================================
//==                         Mocks                              ==
//================================================================

// Mock the Comment Mongoose Model
jest.mock('../models/comment.model', () => ({
    countDocuments: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
}));


//================================================================
//==                       Test Suite                           ==
//================================================================

describe('Comment Service', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    //----------------------------------------------------------------
    // 1. Tests for createComment
    //----------------------------------------------------------------
    describe('createComment', () => {
        const userId = new Types.ObjectId().toHexString();
        const commentData = { text: 'This is a great post!' };

        it('should create a comment successfully if user has less than 3 comments', async () => {
            (Comment.countDocuments as jest.Mock).mockResolvedValue(2);
            const createdComment = { _id: new Types.ObjectId(), user: userId, ...commentData };
            (Comment.create as jest.Mock).mockResolvedValue(createdComment);

            const result = await createComment(userId, commentData);

            expect(Comment.countDocuments).toHaveBeenCalledWith({ user: userId });
            expect(Comment.create).toHaveBeenCalledWith({ user: userId, text: commentData.text });
            expect(result).toEqual(createdComment);
        });

        it('should throw BadRequestError if user has already posted 3 comments', async () => {
            (Comment.countDocuments as jest.Mock).mockResolvedValue(3);

            await expect(createComment(userId, commentData)).rejects.toThrow(
                new BadRequestError('You can only post a maximum of 3 comments.')
            );
        });

        it('should throw BadRequestError if text is empty or just whitespace', async () => {
            await expect(createComment(userId, { text: '   ' })).rejects.toThrow(
                new BadRequestError('Text is required')
            );
        });
    });

    //----------------------------------------------------------------
    // 2. Tests for rateComment
    //----------------------------------------------------------------
    describe('rateComment', () => {
        const userId = new Types.ObjectId().toHexString();
        const commentId = new Types.ObjectId().toHexString();
        // The user property is required to satisfy the Rating type, even though
        // the service function destructures and only uses the score.
        const ratingData: Rating = { user: new Types.ObjectId(), score: 5 };
        const badRatingData: Rating = { user: new Types.ObjectId(), score: 6 };

        it('should add a new rating to a comment', async () => {
            const mockComment = {
                _id: commentId,
                ratings: [] as { user: Types.ObjectId; score: number }[],
                averageScore: 4.5, // This would be calculated by a virtual in the real model
                save: jest.fn().mockResolvedValue(true),
            };
            (Comment.findById as jest.Mock).mockResolvedValue(mockComment);

            const result = await rateComment(userId, commentId, ratingData);

            expect(Comment.findById).toHaveBeenCalledWith(commentId);
            expect(mockComment.ratings.length).toBe(1);
            expect(mockComment.ratings[0].score).toBe(5);
            expect(mockComment.save).toHaveBeenCalled();
            expect(result.averageScore).toBe(4.5);
        });

        it('should update an existing rating on a comment', async () => {
            const mockComment = {
                _id: commentId,
                ratings: [{ user: new Types.ObjectId(userId), score: 3 }],
                averageScore: 3.5,
                save: jest.fn().mockResolvedValue(true),
            };
            (Comment.findById as jest.Mock).mockResolvedValue(mockComment);

            await rateComment(userId, commentId, { ...ratingData, score: 1 });

            expect(mockComment.ratings.length).toBe(1);
            expect(mockComment.ratings[0].score).toBe(1);
            expect(mockComment.save).toHaveBeenCalled();
        });

        it('should throw NotFoundError if comment does not exist', async () => {
            (Comment.findById as jest.Mock).mockResolvedValue(null);
            await expect(rateComment(userId, commentId, ratingData)).rejects.toThrow(NotFoundError);
        });

        it('should throw BadRequestError for a score greater than 5', async () => {
            await expect(rateComment(userId, commentId, badRatingData)).rejects.toThrow(BadRequestError);
        });
    });

    //----------------------------------------------------------------
    // 3. Tests for getAllComments
    //----------------------------------------------------------------
    describe('getAllComments', () => {
        it('should return a paginated list of comments', async () => {
            const mockComments = [{ text: 'Comment 1' }, { text: 'Comment 2' }];
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockComments),
            };
            (Comment.find as jest.Mock).mockReturnValue(mockQuery);
            (Comment.countDocuments as jest.Mock).mockResolvedValue(2);

            const result = await getAllComments(1, 10);

            expect(Comment.find).toHaveBeenCalled();
            expect(Comment.countDocuments).toHaveBeenCalled();
            expect(mockQuery.skip).toHaveBeenCalledWith(0);
            expect(mockQuery.limit).toHaveBeenCalledWith(10);
            expect(result.total).toBe(2);
            expect(result.comments).toEqual(mockComments);
        });
    });
});
