import multer from 'multer';
import { Request } from 'express';

// Limit: 4MB in bytes
// change to ini file
const MAX_SIZE = 4 * 1024 * 1024;

const imageFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
	if (file.mimetype.startsWith('image/')) {
		cb(null, true);
	} else {
		cb(new Error('Only image files are allowed!'));
	}
};

const storage = multer.memoryStorage();

export const uploadProfileImage = multer({
	storage,
	limits: { fileSize: MAX_SIZE },
	fileFilter: imageFilter,
}).single('profileImage');
