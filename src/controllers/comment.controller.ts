import { Response } from "express";
import { AuthenticatedRequest, Rating, IComment } from "../dto";
import { BadRequestError, InternalServerError, NotFoundError } from "../utils";
import { createComment, getAllComments, rateComment } from "../services/comment.service";

export const createCommentController = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await createComment(req._id!, req.body as IComment);
        res.status(201).json(result);
    } catch (err) {
        if (err instanceof BadRequestError) {
            res.status(400).json({ message: err.message });
        } else {
            console.error(err);
            res.status(500).json({ message: new InternalServerError().message });
        }
    }
};

export const rateCommentController = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await rateComment(
            req._id!,
            req.params.commentId,
            req.body as Rating
        );
        res.status(200).json({
            message: 'Rating submitted',
            ...result,
        });
    } catch (err) {
        if (err instanceof NotFoundError) {
            res.status(404).json({ message: err.message });
        } else if (err instanceof BadRequestError) {
            res.status(400).json({ message: err.message });
        } else {
            console.error(err);
            res.status(500).json({ message: new InternalServerError().message });
        }
    }
};

export const getAllCommentsController = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await getAllComments(page, limit);
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: new InternalServerError().message });
    }
};