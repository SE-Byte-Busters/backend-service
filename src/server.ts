import app from './app';
import dotenv from 'dotenv';
import http from 'http';
import { connectMongoDB, disconnectMongoDB, initializeMinioBuckets } from './config';


dotenv.config();
connectMongoDB();
initializeMinioBuckets();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
	console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful Shutdown
const shutdown = () => {
	console.log('\n🛑 Shutting down gracefully...');
	server.close(() => {
		console.log('✅ HTTP server closed.');

		disconnectMongoDB();
	});
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
