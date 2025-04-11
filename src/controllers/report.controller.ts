import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../dto';
import { createReportWithImages, getUserReports } from '../services';
import { logger } from '../config';
import { BadRequestError, UnauthorizedError, InternalServerError, CustomError } from '../utils';

export const createReportController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		const requiredFields = ['title', 'description', 'approximatePosition', 'location', 'city', 'category'];
		for (const field of requiredFields) {
			if (!req.body[field]) {
				throw new BadRequestError(`Missing required field: ${field}`);
			}
		}

		let location;
		try {
			location = JSON.parse(req.body.location);
		} catch (e) {
			throw new BadRequestError('Invalid location format. Must be valid JSON');
		}

		// Process category (can be array or comma-separated string)
		const category = Array.isArray(req.body.category)
			? req.body.category
			: req.body.category.split(',').map((c: string) => c.trim());

		if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
			throw new BadRequestError('At least one image is required');
		}

		if(!req._id){
			throw new UnauthorizedError('User ID is missing in headers');
		}

		const report = await createReportWithImages({
			user: req._id,
			title: req.body.title,
			description: req.body.description,
			approximatePosition: req.body.approximatePosition,
			location,
			city: req.body.city,
			category,
			images: req.files as Express.Multer.File[]
		});

		res.status(201).json({ message: 'Report created successfully.',
				report: {
					...report.toObject(),
					// Optionally remove sensitive fields
				}
		});

	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (UploadProfileImageController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};


// ---------------------------------------------------------------------------------
export const getUserReportsController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req._id;
		if (!userId) {
			throw new BadRequestError('User ID is required');
		}

		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 10;
		const status = req.query.status ? parseInt(req.query.status as string) : undefined;
		const sortBy = req.query.sortBy as 'newest' | 'oldest' | 'score' || 'newest';

		if (page < 1) throw new BadRequestError('Page must be at least 1');
		if (limit < 1 || limit > 100) throw new BadRequestError('Limit must be between 1 and 100');
		if (status && (status < 0 || status > 3)) throw new BadRequestError('Invalid status value');

		const result = await getUserReports({ userId, page, limit, sortBy });

		res.json({ message: "Reports",
			data: {
				reports: result.reports,
				pagination: {
					total: result.total,
					page: result.page,
					totalPages: result.totalPages,
					limit
				}
			}
		});

	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (UploadProfileImageController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};