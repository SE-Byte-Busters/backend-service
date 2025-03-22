import app from './app';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

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

		// Close MongoDB
		// mongoose.connection.close(false, () => {
		//     console.log('✅ MongoDB connection closed.');
		// });

		// // Close PostgreSQL
		// pgClient.end(() => {
		//     console.log('✅ PostgreSQL connection closed.');
		//     process.exit(0); // Exit process
		// });
	});
};

// Signal Handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
