import { Admin } from '../models';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError, UnauthorizedError } from '../utils';
import { MinioBuckets, logger, config } from '../config';

// -------------------------------------------------------------------------------
export const uploadAdminProfileImageService = async (
	_id: string,
	file: Express.Multer.File
): Promise<{ profileUrl: string }> => {
	if (!file) {
		throw new BadRequestError('No file uploaded.');
	}
	const admin = await Admin.findById(_id);
	if (!admin) throw new ForbiddenError('Admin not found.');
	// check update time

	const { client, bucket } = MinioBuckets.profile;

	const ext = path.extname(file.originalname);
	const objectKey = `profiles/${uuidv4()}${ext}`;

	await client.putObject(bucket, objectKey, file.buffer); // , { 'Content-Type': file.mimetype, }

	const profileUrl = `${config.minioConfig.useSSL ? 'https' : 'http'}://${config.minioConfig.endpoint}:${config.minioConfig.port}/${bucket}/${objectKey}`;
	// useSSl string | bool


	if (admin.profileKey) {
		try {
			await client.removeObject(bucket, admin.profileKey);
		} catch (error) {
			logger.warn(`[Warn] Local Error Handler: (uploadProfileImageService) \n ${error}`);
		}
	}

	admin.profileUrl = profileUrl;
	admin.profileKey = objectKey;
	await admin.save();

	return { profileUrl };
};


// -------------------------------------------------------------------------------
interface UpdateAdminProfileDTO { 
	_id: string; firstName?: string; lastName?: string; username?: string; email?: string; 
};

export const updateAdminProfileService = async (
	{ _id, firstName, lastName, username, email, }: UpdateAdminProfileDTO
) => { 
	const admin = await Admin.findById(_id);

	if (!admin) {
		throw new NotFoundError('Admin not found');
	}

	if (email && email !== admin.email) {
		const emailExists = await Admin.exists({ email });
		if (emailExists) {
			throw new ConflictError('Email already taken.'); // security issue
		}
		admin.email = email;
	}
	if (firstName !== undefined) {
		admin.firstName = firstName;
	}
	if (lastName !== undefined) {
		admin.lastName = lastName;
	}
	if (username !== undefined && username !== admin.username) {
		admin.username = username;
	}
	await admin.save();

	return {
		_id: admin._id, firstName: admin.firstName, lastName: admin.lastName,
		username: admin.username, email: admin.email,
	};
};


// -------------------------------------------------------------------------------
interface UpdatePasswordParams { _id: string; oldPassword: string; newPassword: string; }

export const updateAdminPasswordService = async (
	{ _id, oldPassword, newPassword, }: UpdatePasswordParams
) => { 
	const admin = await Admin.findById(_id)
	if (!admin) {
		throw new NotFoundError('Admin not found');
	}

	const isMatch = await admin.comparePassword(oldPassword);
	if (!isMatch) {
		throw new UnauthorizedError('Old password is incorrect.');
	}

	const hashedPassword = await admin.hashPassword(newPassword);
	admin.password = hashedPassword;
	await admin.save();
};
