import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../dto';
import { addCommentService, addReqSolveReportService, createReportWithImages, getReportByIdService, getReportCommentsService, getReqSolvesReportService, getUserReports, searchReportsInMapArea, searchReportsNearLocation, setReportResolvedByService, updatePriorityAndApprovalStatus } from '../services';
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

		if (!req._id) {
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

		res.status(201).json({
			message: 'Report created successfully.',
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

		res.json({
			message: "Reports",
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


// ---------------------------------------------------------------------------------
export async function searchInMapBounds(req: AuthenticatedRequest, res: Response) {
	try {
		const { neLat, neLng, swLat, swLng, filter, zoom } = req.query;

		// Validate coordinates
		if (!neLat || !neLng || !swLat || !swLng) {
			throw new BadRequestError('Map bounds coordinates are required');
		}

		const bounds = {
			ne: {
				lat: parseFloat(neLat as string),
				lng: parseFloat(neLng as string)
			},
			sw: {
				lat: parseFloat(swLat as string),
				lng: parseFloat(swLng as string)
			}
		};

		// Validate coordinate values
		if (isNaN(bounds.ne.lat) || isNaN(bounds.ne.lng) ||
			isNaN(bounds.sw.lat) || isNaN(bounds.sw.lng)) {
			throw new BadRequestError('Invalid coordinate values');
		}

		// Validate filter parameter
		const validFilters = ['all', 'done', 'notDone'];
		const completionFilter = validFilters.includes(filter as string)
			? filter as 'all' | 'done' | 'notDone'
			: 'all';

		const zoomLevel = zoom ? parseInt(zoom as string) : undefined;

		const reports = await searchReportsInMapArea({
			bounds,
			completionFilter,
			zoomLevel
		});

		res.status(200).json({
			message: "Reports",
			data: reports
		});

	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (UploadProfileImageController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
}


// ---------------------------------------------------------------------------------
export async function searchNearLocation(req: AuthenticatedRequest, res: Response) {
	try {
		const { lat, lng, radius, filter } = req.query;

		// Validate coordinates
		if (!lat || !lng) {
			throw new BadRequestError('Center coordinates are required');
		}

		const center = {
			lat: parseFloat(lat as string),
			lng: parseFloat(lng as string)
		};

		if (isNaN(center.lat) || isNaN(center.lng)) {
			throw new BadRequestError('Invalid coordinate values');
		}

		const radiusInMeters = radius ? parseInt(radius as string) : 5000;
		if (isNaN(radiusInMeters) || radiusInMeters <= 0) {
			throw new CustomError('Invalid radius value', 400);
		}

		// Validate filter parameter
		const validFilters = ['all', 'done', 'notDone'];
		const completionFilter = validFilters.includes(filter as string)
			? filter as 'all' | 'done' | 'notDone'
			: 'all';

		const reports = await searchReportsNearLocation(
			center,
			radiusInMeters,
			completionFilter
		);

		res.status(200).json({
			message: "Reports",
			data: reports
		});

	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (UploadProfileImageController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
}

// ---------------------------------------------------------------------------------
// am
export const addReportCommentController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		const { reportId } = req.params;
		const { text } = req.body;

		if (!text || text.length > 500) {
			throw new BadRequestError('Comment text is required and must be less than 500 characters.');
		}

		await addCommentService(reportId, req._id, text);

		res.status(201).json({ message: 'Comment added successfully.' });
	} catch (error) {
		if (error instanceof BadRequestError) {
			res.status(400).json({ message: error.message });
		} else {
			logger.error(`[Error] addReportCommentController\n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};

// ---------------------------------------------------------------------------------
// am
export const getReportCommentsController = async (req: Request, res: Response): Promise<void> => {
	try {
		const { reportId } = req.params;

		const comments = await getReportCommentsService(reportId);

		res.status(200).json({
			comments,
		});
	} catch (error) {
		// مدیریت خطا
		if (error instanceof BadRequestError) {
			res.status(404).json({ message: error.message });
		} else {
			logger.error(`[Error] getReportCommentsController\n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};

// ---------------------------------------------------------------------------------
// am
export const addReqSolveReportController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
	try {
		const { reportId } = req.params;
		const { text } = req.body;

		if (!text || text.length > 500) {
			throw new BadRequestError('Req Solved text is required and must be less than 500 characters.');
		}

		await addReqSolveReportService(reportId, req._id, text);

		res.status(201).json({ message: 'Req Solved added successfully.' });
	} catch (error) {
		if (error instanceof BadRequestError) {
			res.status(400).json({ message: error.message });
		} else {
			logger.error(`[Error] addReqSolveReportController\n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};
// ---------------------------------------------------------------------------------
// am
export const getReqSolvesReportController = async (req: Request, res: Response): Promise<void> => {
	try {
		const { reportId } = req.params;

		const usersReqSovled = await getReqSolvesReportService(reportId);

		res.status(200).json({
			usersReqSovled,
		});
	} catch (error) {
		// مدیریت خطا
		if (error instanceof BadRequestError) {
			res.status(404).json({ message: error.message });
		} else {
			logger.error(`[Error] getReqSolvesReportController\n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};
// ---------------------------------------------------------------------------------
// am
export const setReportResolvedByController = async (req: Request, res: Response): Promise<void> => {
	try {
		const { reportId, userId } = req.params;

		const result = await setReportResolvedByService(reportId, userId);

		res.status(200).json(result);
	} catch (error) {
		if (error instanceof BadRequestError) {
			res.status(400).json({ message: error.message });
		} else {
			logger.error(`[setReportResolvedByController] Unexpected error: ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};
// ---------------------------------------------------------------------------------
// am
export const getReportByIdController = async (req: Request, res: Response): Promise<void> => {
	try {
		const { reportId } = req.params;


		const report = await getReportByIdService(reportId);
		res.status(200).json({ report });
	} catch (error) {
		if (error instanceof BadRequestError) {
			res.status(404).json({ message: error.message });
		} else {
			console.error(error);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};
// ---------------------------------------------------------------------------------
// just admin access to this api
export const updateReportStatusController = async (req: Request, res: Response): Promise<void> => {
	try {
		const { reportId } = req.params;
		const { priority, approvalStatus } = req.body;

		const result = await updatePriorityAndApprovalStatus(reportId, { priority, approvalStatus });

		res.status(200).json(result);
	} catch (error) {
		if (error instanceof BadRequestError) {
			res.status(400).json({ message: error.message });
		} else {
			console.error(error);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};