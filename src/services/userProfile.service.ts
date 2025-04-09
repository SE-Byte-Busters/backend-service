import { User } from '../models';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { BadRequestError, ForbiddenError } from '../utils';
import { MinioBuckets, logger, config } from '../config';

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
