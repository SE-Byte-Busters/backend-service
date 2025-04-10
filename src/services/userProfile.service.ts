import { User } from '../models';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import bcrypt from 'bcrypt';
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError, UnauthorizedError } from '../utils';
import { MinioBuckets, logger, config } from '../config';

// -------------------------------------------------------------------------------
export const uploadProfileImageService = async (
	_id: string,
	file: Express.Multer.File
): Promise<{ profileUrl: string }> => {
	if (!file) {
		throw new BadRequestError('No file uploaded.');
	}
	const user = await User.findById(_id);
	if (!user) throw new ForbiddenError('User not found.');
	// check update time

	const { client, bucket } = MinioBuckets.profile;

	const ext = path.extname(file.originalname);
	const objectKey = `profiles/${uuidv4()}${ext}`;

	await client.putObject(bucket, objectKey, file.buffer); // , { 'Content-Type': file.mimetype, }

	const profileUrl = `${config.minioConfig.useSSL ? 'https' : 'http'}://${config.minioConfig.endpoint}:${config.minioConfig.port}/${bucket}/${objectKey}`;
	// useSSl string | bool


	if (user.profileKey) {
		try {
			await client.removeObject(bucket, user.profileKey);
		} catch (error) {
			logger.warn(`[Warn] Local Error Handler: (uploadProfileImageService) \n ${error}`);
		}
	}

	user.profileUrl = profileUrl;
	user.profileKey = objectKey;
	await user.save();

	return { profileUrl };
};


// -------------------------------------------------------------------------------
interface UpdateUserProfileDTO { 
	_id: string; firstName?: string; lastName?: string; username?: string; email?: string; 
};

export const updateUserProfileService = async (
	{ _id, firstName, lastName, username, email, }: UpdateUserProfileDTO
) => { 
	const user = await User.findById(_id);

	if (!user) {
		throw new NotFoundError('User not found');
	}

	if (email && email !== user.email) {
		const emailExists = await User.exists({ email });
		if (emailExists) {
			throw new ConflictError('Email already taken.'); // security issue
		}
		user.email = email;
	}
	if (username !== undefined) {
		user.username = username;
	}
	if (firstName !== undefined) {
		user.firstName = firstName;
	}
	if (lastName !== undefined) {
		user.lastName = lastName;
	}
	await user.save();

	return {
		_id: user._id, firstName: user.firstName, lastName: user.lastName,
		username: user.username, email: user.email,
	};
};


// -------------------------------------------------------------------------------
interface UpdatePasswordParams { _id: string; oldPassword: string; newPassword: string; }

export const updateUserPasswordService = async (
	{ _id, oldPassword, newPassword, }: UpdatePasswordParams
) => { 
	const user = await User.findById(_id)
	if (!user) {
		throw new NotFoundError('User not found');
	}

	const isMatch = await user.comparePassword(oldPassword);
	if (!isMatch) {
		throw new UnauthorizedError('Old password is incorrect.');
	}

	const hashedPassword = await user.hashPassword(newPassword);
	user.password = hashedPassword;
	await user.save();
};