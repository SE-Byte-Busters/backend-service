import pino from 'pino';
import TransportTarget from 'pino';
import pinoHttp from 'pino-http';
// import rfs from 'rotating-file-stream';
const rfs = require('rotating-file-stream');
import path from 'path';
import { Request, Response } from 'express-serve-static-core';

// change to ini file
const logDirectory = path.join(__dirname, '../../logs');
const isProduction = process.env.NODE_ENV === 'production';

// change to ini file
const combinedStream = rfs.createStream('combined.log', {
	size: '10M',  // Rotate every 10MB
	interval: '7d',  // Rotate weekly
	compress: 'gzip',
	path: logDirectory,
});

const errorStream = rfs.createStream('error.log', {
	size: '10M',
	interval: '7d',
	compress: 'gzip',
	path: logDirectory,
});

const criticalStream = rfs.createStream('critical.log', {
	size: '10M',
	interval: '7d',
	compress: 'gzip',
	path: logDirectory,
});

const transportTargets: (TransportTarget.TransportTargetOptions|TransportTarget.TransportPipelineOptions)[] = [
	{ target: 'pino/file', level: 'info', options: { destination: path.join(logDirectory, 'combined.log') } },
	{ target: 'pino/file', level: 'error', options: { destination: path.join(logDirectory, 'error.log') } },
	{ target: 'pino/file', level: 'fatal', options: { destination: path.join(logDirectory, 'critical.log') } },
];

if (!isProduction) {
	transportTargets.push({ target: 'pino-pretty', level: 'debug', options: { colorize: true } });
}

// Pino Logger Configuration
export const logger = pino(
	{
		level: 'info',
		transport: {
			targets: transportTargets,
		},
	}
);

export const expressLogger = pinoHttp({
	logger,
	customSuccessMessage: (req: Request, res: Response) => {
		return `${req.method}, ${req.url}`;
	},
	serializers: {
		req: (req) => ({
			method: req.method,
			url: req.url,
		}),
		res: (res) => ({
			statusCode: res.statusCode,
		}),
	},
});