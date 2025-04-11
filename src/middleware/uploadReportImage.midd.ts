import multer from 'multer';
import { Request } from 'express';
import { config } from '../config';
import { UnsupportedMediaType } from '../utils';

const imageFilter = (
	req: Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	if (config.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new UnsupportedMediaType(`Only ${config.ALLOWED_MIME_TYPES.join(', ')} files are allowed!`));
	}
};

export const reportUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: config.MAX_IMAGE_SIZE, // e.g., 5MB
		files: 5 // Maximum 5 images
	},
	fileFilter: imageFilter
}).array('images', 5); // Field name 'images', max 5 files
