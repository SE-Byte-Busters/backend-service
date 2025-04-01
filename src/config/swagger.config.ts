import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import path from 'path';

const options: swaggerJsdoc.Options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Clean City API',
			version: '1.0.0',
			description: 'API documentation for Clean City platform',
		},
		servers: [
			{
				url: `http://localhost:${process.env.PORT}/api/v1/`,
				description: 'Local Server',
			},
		],
	},
	apis: [path.join(__dirname, '../routes/*.ts')],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Application) => {
	app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
	console.log('📄 Swagger docs available at /api-docs');
};
