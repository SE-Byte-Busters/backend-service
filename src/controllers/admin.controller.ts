import { Response } from 'express';
import { uploadAdminProfileImageService, updateAdminProfileService, updateAdminPasswordService, adminGetPendingReportService, adminGetStatedReportService } from '../services/';
import { CustomError, InternalServerError } from '../utils';
import { logger } from '../config';
import { AuthenticatedRequest } from '../dto';

export const handleAdminUploadProfileImage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		const userId = req._id;
		if (!userId || typeof userId !== 'string') {
			res.status(403).json({ message: 'User ID is missing in headers.' });
		} else if (!req.file) {
			res.status(400).json({ message: 'No image file uploaded.' });
		} else {
			const result = await uploadAdminProfileImageService(userId, req.file);

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

export const updateAdminProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		const userId = req._id;
		if (!userId || typeof userId !== 'string') {
			res.status(403).json({ message: 'User ID is missing in headers.' });
		} else {
			const result = await updateAdminProfileService({ _id: userId, firstName: req.body.firstName, lastName: req.body.lastName, username: req.body.username, email: req.body.email });

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

export const updateAdminPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		const userId = req._id;
		if (!userId || typeof userId !== 'string') {
			res.status(403).json({ message: 'User ID is missing in headers.' });
		} else {
			await updateAdminPasswordService({ _id: userId, oldPassword: req.body.oldPassword, newPassword: req.body.newPassword });

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

export const getPendingReportController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		// check for admin role
		const userId = req._id;
		let { page, limit, sortBy } = req.query;
		if (!userId || typeof userId !== 'string') {
			res.status(403).json({ message: 'User ID is missing in headers.' });
		} else if (!page || !limit || !sortBy) {
			res.status(400).json({ message: 'Parameter is missing.' });
		} else {
			const pageNumber = page ? parseInt(page as string) : 1;
			const limitNumber = limit ? parseInt(limit as string) : 10;
			const sortByString = sortBy as string || 'oldest';

			if (isNaN(pageNumber) || isNaN(limitNumber)) {
				res.status(400).json({ message: 'Invalid page or limit value.' });
				return;
			}
			const result = await adminGetPendingReportService(pageNumber, limitNumber, sortByString);

			res.status(200).json({ message: 'Pending reports.', data: result });
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






export const getStatedReportController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		// check for admin role
		const userId = req._id;
		let { page, limit, sortBy } = req.query;
		if (!userId || typeof userId !== 'string') {
			res.status(403).json({ message: 'User ID is missing in headers.' });
		} else if (!page || !limit || !sortBy) {
			res.status(400).json({ message: 'Parameter is missing.' });
		} else {
			const pageNumber = page ? parseInt(page as string) : 1;
			const limitNumber = limit ? parseInt(limit as string) : 10;
			const sortByString = sortBy as string || 'oldest';

			if (isNaN(pageNumber) || isNaN(limitNumber)) {
				res.status(400).json({ message: 'Invalid page or limit value.' });
				return;
			}
			const result = await adminGetStatedReportService(pageNumber, limitNumber, sortByString);

			res.status(200).json({ message: 'Stated reports.', data: result });
		}
	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (getStatedReportController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};