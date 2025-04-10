import { Response } from 'express'; 
import { uploadProfileImageService, updateUserProfileService, updateUserPasswordService } from '../services/';
import { CustomError, InternalServerError } from '../utils';
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

