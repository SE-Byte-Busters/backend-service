import dotenv from 'dotenv';

dotenv.config();

export const config = {
	minioConfig: {
		endpoint: process.env.MINIO_ENDPOINT || 'localhost',
		port: parseInt(process.env.MINIO_PORT || '9000'),
		useSSL: process.env.MINIO_USE_SSL === 'true',
		accessKey: process.env.MINIO_ACCESS_KEY || 'your-access-key',
		secretKey: process.env.MINIO_SECRET_KEY || 'your-secret-key',
		bucketName: 'DestinationBucketName',
	},
	minioBuckets: {
		profileBucketName: process.env.MINIO_USER_PROFILE_BUCKET || 'user-photos',
		reportBucketName: process.env.MINIO_USER_REPORTS || 'user-report',
	},
};
