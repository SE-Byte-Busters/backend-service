import { Types } from "mongoose";
import { Comment } from "../models";
import { BadRequestError, NotFoundError } from "../utils";
import { IComment, Rating } from "../dto";


export const createComment = async (
    userId: string,
    { text }: { text: string }
) => {
    if (!text || text.trim() === '') {
        throw new BadRequestError('Text is required');
    }

    // ✅ Check if user has already posted 3 comments
    const userCommentCount = await Comment.countDocuments({ user: userId });

    if (userCommentCount >= 3) {
        throw new BadRequestError('You can only post a maximum of 3 comments.');
    }

    // ✅ Create the comment
    const comment = await Comment.create({
        user: userId,
        text,
    });

    return comment;
};

export const rateComment = async (
    userId: string,
    commentId: string,
    { score }: Rating
) => {
    if (score < 0 || score > 5) {
        throw new BadRequestError('Score must be between 0 and 5');
    }

    const comment = await Comment.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');

    const existingRating = comment.ratings.find((r) =>
        r.user.equals(userId)
    );

    if (existingRating) {
        existingRating.score = score;
    } else {
        comment.ratings.push({ user: new Types.ObjectId(userId), score });
    }

    await comment.save();

    return {
        averageScore: comment.averageScore,
        totalRatings: comment.ratings.length,
    };
};

export const getAllComments = async (
    page: number = 1,
    limit: number = 10
) => {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
        Comment.find()
            .populate('user', 'name email') // adjust fields as needed
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }),
        Comment.countDocuments(),
    ]);

    return {
        total,
        page,
        pageSize: comments.length,
        comments,
    };
};