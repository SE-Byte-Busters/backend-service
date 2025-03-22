import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { Application, Request, Response, NextFunction } from 'express-serve-static-core';
import ini from 'ini';
import fs from 'node:fs';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import { logger, expressLogger } from './config/logger';
const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const port = parseInt(config.server.port);
// import routes from './routes'; // Import your routes


const app: Application = express();

// Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(hpp());
app.use(expressLogger);

// change to config file
// Rate Limiter (e.g., max 100 requests per 15 minutes)
const limiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	message: 'Too many requests from this IP, please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
});
app.use(limiter);

// Basic Health Check
app.get('/health', (req: Request, res: Response<{ status: String }>) => {
	res.status(200).json({ status: 'Healthy' });
});

// Application Routes
// app.use('/api/v1', routes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
	logger.error(`[Error] Global Error Handler: ${err.message}`);
	res.status(err.status || 500).json({
		message: err.message || 'Internal Server Error',
		error: process.env.NODE_ENV === 'development' ? err : {},
	});
});

// Handle 404 - Not Found
app.use((req: Request, res: Response) => {
	logger.warn(`[404] Resource not found - ${req.originalUrl}`);
	res.status(404).json({ message: 'Resource not found' });
});

export default app;
