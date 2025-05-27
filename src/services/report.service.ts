import Report from '../models/report.model';
import { MinioBuckets, config } from '../config';
import { Model, Mongoose } from 'mongoose';
import { CommentWithUser, IReport, IUser } from '../dto';
import { BadRequestError } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import mongoose from 'mongoose';
import { notif } from '../utils/notif.utils';


interface CreateReportParams {
	user: string;
	title: string;
	description: string;
	approximatePosition: string;
	location: {
		type: 'Point' | 'Area';
		coordinates: number[];
	};
	city?: string;
	category?: string[];
	images: Express.Multer.File[];
}

interface UploadedImage {
	key: string,
	url: string,
};

export async function createReportWithImages(params: CreateReportParams) {
	const { images, ...reportData } = params;
	if (reportData.location.type === 'Point' && reportData.location.coordinates.length !== 2) {
		throw new BadRequestError('Point locations require exactly 2 coordinates [longitude, latitude]');
	} else if (reportData.location.type === 'Area') {
		throw new BadRequestError('Area locations will be available in next version');
	}
	let uploadedImages: UploadedImage[] = [];
	const { client, bucket } = MinioBuckets.reports;

	try {
		if (!images || images.length === 0) {
			throw new BadRequestError('At least one image is required');
		}

		uploadedImages = await Promise.all(
			images.map(async (image) => {
				const ext = path.extname(image.originalname);
				const objectKey = `reports/${uuidv4()}${ext}`;

				await client.putObject(bucket, objectKey, image.buffer);
				const imageUrl = `${config.minioConfig.useSSL ? 'https' : 'http'}://${config.minioConfig.endpoint}:${config.minioConfig.port}/${bucket}/${objectKey}`;

				return { key: objectKey, url: imageUrl };
			})
		);

		const report = await Report.create({
			...reportData,
			images: uploadedImages,
			completionStatus: 0,
			status: 0,
			approvalStatus: 0, // Pending
			voteScore: 0,
		});

		return report;

	} catch (error) {
		if (uploadedImages.length > 0) {
			await Promise.all(
				uploadedImages.map(img => client.removeObject(bucket, img.key))
			);
		};

		throw error;
	}
};


// ------------------------------------------------------------------------
interface GetUserReportsParams {
	userId: string;
	page?: number;
	limit?: number;
	sortBy?: 'newest' | 'oldest' | 'score';
}

export async function getUserReports({ userId, page = 1, limit = 10, sortBy = 'newest' }: GetUserReportsParams) {
	try {
		const query = { user: userId };

		let sortOption = {};
		switch (sortBy) {
			case 'oldest':
				sortOption = { createdAt: 1 };
				break;
			case 'score':
				sortOption = { score: -1 };
				break;
			case 'newest':
			default:
				sortOption = { createdAt: -1 };
		}

		const [reports, total] = await Promise.all([
			Report.find(query).sort(sortOption).skip((page - 1) * limit).limit(limit).lean(),
			Report.countDocuments(query)
		]);

		return { reports, total, page, totalPages: Math.ceil(total / limit) };
	} catch (error) {
		console.error('Error fetching user reports:', error);
		throw new Error('Failed to fetch user reports');
	}
};


// ------------------------------------------------------------------------
interface MapSearchOptions {
	bounds: {
		ne: { lat: number; lng: number };
		sw: { lat: number; lng: number };
	};
	completionFilter?: 'all' | 'done' | 'notDone';
	zoomLevel?: number;
}

export async function searchReportsInMapArea(options: MapSearchOptions): Promise<IReport[]> {
	const { bounds, completionFilter = 'all', zoomLevel } = options;

	// Create GeoJSON polygon for the map bounds
	const polygon = {
		type: 'Polygon',
		coordinates: [[
			[bounds.sw.lat, bounds.sw.lng], // SW (lat, lng)
            [bounds.ne.lat, bounds.sw.lng], // SE (lat, lng)
            [bounds.ne.lat, bounds.ne.lng], // NE (lat, lng)
            [bounds.sw.lat, bounds.ne.lng], // NW (lat, lng)
            [bounds.sw.lat, bounds.sw.lng]  // Close polygon
		]]
	};

	// Build the query conditions
	const queryConditions: any = {
		'location.coordinates': {
			$geoWithin: {
				$geometry: polygon
			}
		}
	};

	// Add completion status filter if specified
	if (completionFilter !== 'all') {
		queryConditions.completionStatus = completionFilter === 'done' ?
			{ $in: [1] } : // Done status
			{ $nin: [2] }; // Not done status
	}

	// For better performance at higher zoom levels (more detailed view)
	const limit = zoomLevel && zoomLevel > 10 ? 500 : 200;

	return await Report.find(queryConditions).limit(limit).lean().exec();;
}

// Alternative method for point-radius search
export async function searchReportsNearLocation(
	center: { lat: number; lng: number },
	radiusInMeters: number,
	completionFilter?: 'all' | 'done' | 'notDone'
): Promise<IReport[]> {
	const queryConditions: any = {
		'location.coordinates': {
			$geoWithin: {
				$centerSphere: [
					[center.lng, center.lat],
					radiusInMeters / 6378137 // Convert meters to radians
				]
			}
		}
	};

	if (completionFilter && completionFilter !== 'all') {
		queryConditions.completionStatus = completionFilter === 'done' ?
			{ $in: [1, 2] } :
			{ $nin: [1, 2] };
	}

	return Report.find(queryConditions)
		.limit(200)
		.lean()
		.exec();
}


export const addCommentService = async (reportId: string, userId: string | undefined, text: string) => {
	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		throw new BadRequestError('Invalid Report ID');
	}

	if (!text || typeof text !== 'string' || text.trim().length === 0) {
		throw new BadRequestError('Comment text is required');
	}

	const report = await Report.findById(reportId);
	if (!report) {
		throw new BadRequestError('Report not found');

	}
	if (!userId) {
		throw new BadRequestError('User not found');
	}
	if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
		throw new BadRequestError('Invalid User ID');
	}

	const Id = new mongoose.Types.ObjectId(userId);

	report.comments.push({
		user: Id,
		text: text.trim(),
		date: new Date(),
	});
	await report.save();

	return {
		message: 'Comment added successfully',
		reportId: report._id,
		comment: report.comments.at(-1),
	};
};





export const getReportCommentsService = async (
	reportId: string
): Promise<CommentWithUser[]> => {
	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		throw new BadRequestError('Invalid Report ID');
	}

	const report = await Report.findById(reportId)
		.populate<{ comments: CommentWithUser[] }>({
			path: 'comments.user',
			select: 'username'
		})
		.lean()
		.exec();

	if (!report || !report.comments) {
		throw new BadRequestError('Report not found or has no comments');
	}

	return report.comments.map(comment => ({
		_id: comment._id,
		user: {
			_id: comment.user._id,
			username: comment.user.username
		},
		text: comment.text,
		date: comment.date
	}));

};


export const addReqSolveReportService = async (
	reportId: string,
	userId: string | undefined,
	text: string
) => {
	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		throw new BadRequestError('Invalid report ID');
	}

	if (!text || typeof text !== 'string' || text.trim().length === 0) {
		throw new BadRequestError('Request text is required');
	}

	const report = await Report.findById(reportId);
	if (!report) {
		throw new BadRequestError('Report not found');
	}

	if (!userId) {
		throw new BadRequestError('User ID is required');
	}
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new BadRequestError('Invalid user ID');
	}

	const userObjectId = new mongoose.Types.ObjectId(userId);

	const newRequest = {
		user: userObjectId,
		text: text.trim(),
		date: new Date(),
	};

	report.usersReqSolve.push(newRequest);
	await report.save();

	return {
		message: 'Request added successfully',
		reportId: report._id,
		request: newRequest,
	};
};


export const getReqSolvesReportService = async (
	reportId: string
): Promise<CommentWithUser[]> => {
	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		throw new BadRequestError('Invalid report ID');
	}

	const report = await Report.findById(reportId)
		.populate<{ usersReqSolve: CommentWithUser[] }>({
			path: 'usersReqSolve.user',
			select: 'username'
		})
		.lean()
		.exec();

	if (!report || !report.usersReqSolve) {
		throw new BadRequestError('Report not found or has no solve requests');
	}

	return report.usersReqSolve.map((reqSolve) => ({
		_id: reqSolve._id,
		user: {
			_id: reqSolve.user._id,
			username: reqSolve.user.username
		},
		text: reqSolve.text,
		date: reqSolve.date
	}));
};

export const setReportResolvedByService = async (
	reportId: string,
	userId: string | undefined
): Promise<{ message: string; resolvedBy: string; resolvedAt: Date }> => {
	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		throw new BadRequestError('Invalid report ID');
	}
	if (!userId) {
		throw new BadRequestError('Invalid user ID');
	}
	if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
		throw new BadRequestError('Invalid user ID');
	}

	const report = await Report.findById(reportId);
	if (!report) {
		throw new BadRequestError('Report not found');
	}

	report.resolvedBy = new mongoose.Types.ObjectId(userId);
	report.resolvedAt = new Date();
	await report.save();

	return {
		message: 'Report marked as resolved',
		resolvedBy: userId,
		resolvedAt: report.resolvedAt
	};
};


export const getReportByIdService = async (reportId: string) => {
	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		throw new BadRequestError('Invalid report ID');
	}

	const report = await Report.findById(reportId)
		.populate('user', 'username')
		.lean()
		.exec();

	if (!report) {
		throw new BadRequestError('Report not found');
	}

	return report;
};


export const updatePriorityAndApprovalStatus = async (
	reportId: string,
	data: { priority: string; approvalStatus: number }
) => {
	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		throw new BadRequestError('Invalid report ID');
	}

	const { priority, approvalStatus } = data;

	if (!['High', 'Medium', 'Low'].includes(priority)) {
		throw new BadRequestError('Invalid priority value');
	}

	if (![0, 1, 2].includes(approvalStatus)) {
		throw new BadRequestError('Invalid approval status value');
	}

	const report = await Report.findById(reportId).populate('user') as any; // Populate and cast to `any`
	if (!report) {
		throw new BadRequestError('Report not found');
	}

	report.priority = priority as 'High' | 'Medium' | 'Low';
	report.approvalStatus = approvalStatus;

	await report.save();

	// Explicitly cast the user to IUser type
	const user = report.user as IUser;

	if (!user || !user.phoneNumber) {
		throw new BadRequestError('User or phone number not found');
	}

	// send the phone number to the notification service
	await notif(user.phoneNumber, report.title, report.approvalStatus); // Example notification service

	return {
		message: 'Priority and approval status updated successfully',
		reportId: report._id,
		priority: report.priority,
		approvalStatus: report.approvalStatus,

	};
};
type VoteDirection = 'Up' | 'Down';

export const voteOnReport = async (
	reportId: string,
	data: { userId: string | undefined; direction: VoteDirection }
) => {
	const { userId, direction } = data;

	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		throw new BadRequestError('Invalid report ID');
	}
	if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
		throw new BadRequestError('Invalid user ID');
	}
	if (!['Up', 'Down'].includes(direction)) {
		throw new BadRequestError('Invalid vote direction');
	}

	const report = await Report.findById(reportId);
	if (!report) {
		throw new BadRequestError('Report not found');
	}

	const existingVoteIndex = report.votes.findIndex(
		(v) => v.user.toString() === userId
	);

	if (existingVoteIndex > -1) {
		// به‌روزرسانی رأی قبلی
		report.votes[existingVoteIndex].direction = direction;
	} else {
		// رأی جدید
		report.votes.push({ user: new mongoose.Types.ObjectId(userId), direction });
	}

	// محاسبه امتیازهای بدون ذخیره در دیتابیس
	let voteScore = 0;
	let voteUpScore = 0;
	let voteDownScore = 0;

	for (const vote of report.votes) {
		if (vote.direction === 'Up') {
			voteUpScore++;
			voteScore++;
		} else if (vote.direction === 'Down') {
			voteDownScore++;
			voteScore--;
		}
	}

	// ذخیره تغییرات فقط در voteScore
	report.voteScore = voteScore;

	await report.save();

	return {
		message: 'Vote recorded successfully',
		reportId: report._id,
		voteScore: report.voteScore,
		voteUpScore, // ارسال تعداد Up در خروجی
		voteDownScore, // ارسال تعداد Down در خروجی
		totalVotes: report.votes.length
	};
};
