import { Client } from 'minio';
import { config } from './config';

const minioClient = new Client({
	endPoint: config.minioConfig.endpoint,
	port: config.minioConfig.port,
	useSSL: config.minioConfig.useSSL,
	accessKey: config.minioConfig.accessKey,
	secretKey: config.minioConfig.secretKey,
});

async function ensureBucketExists(bucketName: string) {
	const exists = await minioClient.bucketExists(bucketName);
	if (!exists) {
		await minioClient.makeBucket(bucketName, '');
	}
}

export const MinioBuckets = {
	profile: {
		client: minioClient,
		bucket: config.minioBuckets.profileBucketName,
		init: () => ensureBucketExists(config.minioBuckets.profileBucketName),
	},
	// reports: {
	// 	client: minioClient,
	// 	bucket: config.minioBuckets.reportBucketName,
	// 	init: () => ensureBucketExists(config.minioBuckets.reportBucketName),
	// },
};

export async function initializeMinioBuckets() {
	try {
		const bucketInitializers = Object.values(MinioBuckets).map(bucket => bucket.init());
		await Promise.all(bucketInitializers);
		console.log('✅ All MinIO buckets initialized successfully');

		// Optional: Set bucket policies if needed
		// await setBucketPolicies();
	} catch (error) {
		console.error('❌ Failed to initialize MinIO buckets:', error);
		throw error;
	}
}

