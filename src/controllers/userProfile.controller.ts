import { Response } from 'express';
import { uploadProfileImageService, updateUserProfileService, updateUserPasswordService, getScoreAndRank, getUserProfile, getTopUsersByScore, addBadgeToUser } from '../services/';
import { BadRequestError, CustomError, InternalServerError } from '../utils';
import { logger } from '../config';
import { AuthenticatedRequest } from '../dto';

export const handleUploadProfileImage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		const userId = req._id;
		if (!userId || typeof userId !== 'string') {
			res.status(403).json({ message: 'User ID is missing in headers.' });
		} else if (!req.file) {
			res.status(400).json({ message: 'No image file uploaded.' });
		} else {
			const result = await uploadProfileImageService(userId, req.file);

			res.status(200).json({ message: 'Profile image uploaded successfully.', data: result });
		}
	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (UploadProfileImageController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};

export const updateUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		const userId = req._id;
		if (!userId || typeof userId !== 'string') {
			res.status(403).json({ message: 'User ID is missing in headers.' });
		} else {
			const result = await updateUserProfileService({ _id: userId, firstName: req.body.firstName, lastName: req.body.lastName, username: req.body.username, email: req.body.email });

			res.status(200).json({ message: 'Profile updated successfully.', data: result });
		}
	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (UploadProfileImageController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};

export const updateUserPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		const userId = req._id;
		if (!userId || typeof userId !== 'string') {
			res.status(403).json({ message: 'User ID is missing in headers.' });
		} else {
			await updateUserPasswordService({ _id: userId, oldPassword: req.body.oldPassword, newPassword: req.body.newPassword });

			res.status(200).json({ message: 'Password updated successfully.', data: undefined });
		}
	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (UploadProfileImageController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};


export const scoreAndRank = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		const userId = req._id;
		if (!userId || typeof userId !== 'string') {
			res.status(403).json({ message: 'User ID is missing in headers.' });
		} else {
			const result = await getScoreAndRank(userId);

			res.status(200).json({ message: 'User Score and Rank.', data: result });
		}
	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (UploadProfileImageController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};


export const userProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		const userId = req._id;
		if (!userId || typeof userId !== 'string') {
			res.status(403).json({ message: 'User ID is missing in headers.' });
		} else {
			const result = await getUserProfile(userId);

			res.status(200).json({ message: 'User Profile.', data: result });
		}
	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (UploadProfileImageController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};

// ----------------------------------------------------------------------------------------
export const getTopUsersController = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const limit = parseInt(req.query.limit as string || '10', 10);

		if (isNaN(limit) || limit <= 0) {
			throw new BadRequestError('Limit must be a positive integer');
		}

		const topUsers = await getTopUsersByScore(limit);
		res.status(200).json(topUsers);
	} catch (error) {
		if (error instanceof BadRequestError) {
			res.status(400).json({ message: error.message });
		} else {
			console.error(error);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};

export const addBadgeController = async (req: AuthenticatedRequest, res: Response) => {
	const userId = req.params.id;
	const { badge } = req.body;

	if (!badge) {
		throw new BadRequestError('Badge is required');
	}
	try {
		const updatedBadges = await addBadgeToUser(userId, badge);
		res.status(200).json({ badges: updatedBadges });
	} catch (error) {
		if (error instanceof BadRequestError) {
			res.status(400).json({ message: error.message });
		} else {
			console.error(error);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};
