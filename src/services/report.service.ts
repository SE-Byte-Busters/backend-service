import Report from '../models/report.model';
import { MinioBuckets, config } from '../config';
import { BadRequestError } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

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
				uploadedImages.map(img => client.removeObject(bucket, img.key) )
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
