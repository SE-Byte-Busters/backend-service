import mongoose from 'mongoose';
import dotenv from 'dotenv';
// import { User } from '../models';

dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydb';

export const connectMongoDB = async () => {
	try {
		await mongoose.connect(mongoURI);
		// await User.createIndexes();
		console.log('✅ Connected to MongoDB');
	} catch (error) {
		console.error('❌ MongoDB connection error:', error);
		process.exit(1);
	}
};

export const disconnectMongoDB = async () => {
	try {
		await mongoose.disconnect();
		console.log('✅ Disconnected from MongoDB');
	} catch (error) {
		console.error('❌ Error disconnecting from MongoDB:', error);
	}
};
