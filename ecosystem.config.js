module.exports = {
	apps: [
		{
			name: 'clean-city',
			script: './dist/server.js',
			instances: 'max', // Automatically scale to the number of CPU cores
			exec_mode: 'cluster', // Run in cluster mode for better performance
			env: {
				NODE_ENV: 'production',
			},
			watch: '.',
			autorestart: true,
		},
		{
			// Background job processing: 
			// sending emails, processing data, cleaning up databases, generating reports, push notifications, ...
			name: 'service-worker',
			script: './service-worker/',
			watch: ['./service-worker'],
			env: {
				NODE_ENV: 'production',
			},
			autorestart: true,
		},
	],

	deploy: {
		production: {
			user: 'SSH_USERNAME',
			host: 'SSH_HOSTMACHINE',
			ref: 'origin/master',
			repo: 'GIT_REPOSITORY',
			path: 'DESTINATION_PATH',
			'pre-deploy-local': '',
			'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
			'pre-setup': '',
		},
	},
};
