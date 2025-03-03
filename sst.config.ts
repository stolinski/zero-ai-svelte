/* eslint-disable */
/// <reference path="./.sst/platform/config.d.ts" />
import { execSync } from 'child_process';
import { join } from 'path';

export default $config({
	app(input) {
		return {
			name: 'hello-zero',
			removal: input?.stage === 'production' ? 'retain' : 'remove',
			home: 'aws',
			region: process.env.AWS_REGION || 'us-east-1',
			providers: {
				aws: {
					profile: 'habitpath-production'
				},
				command: '1.0.2'
			}
		};
	},
	async run() {
		const zeroVersion = execSync('npm list @rocicorp/zero | grep @rocicorp/zero | cut -f 3 -d @')
			.toString()
			.trim();

		// VPC Configuration
		const vpc = new sst.aws.Vpc(`E`, {
			az: 2,
			nat: 'ec2'
		});

		// ECS Cluster
		const cluster = new sst.aws.Cluster(`Cluster2`, {
			vpc
		});

		const database = new sst.aws.Postgres('SvelteAIPostgres', {
			vpc,
			database: 'svelte_ai',
			transform: {
				parameterGroup: {
					parameters: [
						{
							name: 'rds.logical_replication',
							value: '1',
							applyMethod: 'pending-reboot'
						},
						{
							name: 'rds.force_ssl',
							value: '0',
							applyMethod: 'pending-reboot'
						},
						{
							name: 'max_connections',
							value: '1000',
							applyMethod: 'pending-reboot'
						}
					]
				}
			},
			dev: {
				username: 'scotttolinski',
				password: process.env.DEV_DB_PW,
				database: 'svelte_ai',
				host: '127.0.0.1',
				port: 5432
			}
		});
		const DB_CONNECTION_STRING = $interpolate`postgresql://${database.username}:${database.password}@${database.host}:${database.port}/${database.database}`;

		// Common environment variables
		const commonEnv = {
			ZERO_UPSTREAM_DB: DB_CONNECTION_STRING,
			ZERO_CVR_DB: DB_CONNECTION_STRING,
			ZERO_CHANGE_DB: DB_CONNECTION_STRING,
			ZERO_AUTH_SECRET: 'secret-shh',
			ZERO_REPLICA_FILE: 'sync-replica.db',
			ZERO_IMAGE_URL: `rocicorp/zero:${zeroVersion}`,
			ZERO_CVR_MAX_CONNS: '10',
			ZERO_UPSTREAM_MAX_CONNS: '10'
		};
		// * ZERO SYNC
		const viewSyncer = new sst.aws.Service('Zero', {
			image: commonEnv.ZERO_IMAGE_URL,
			cluster,
			dev: {
				command: 'npx zero-cache'
			},
			loadBalancer: {
				public: true,
				rules: [{ listen: '80/http', forward: '4848/http' }]
			},
			environment: {
				...commonEnv
			}
		});

		new sst.aws.SvelteKit('SvelteAIChat', {
			vpc: vpc,
			dev: {
				command: 'pnpm run dev'
			},
			environment: {
				DATABASE_URL: DB_CONNECTION_STRING,
				SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
				ZERO_AUTH_SECRET: 'secret-shh',
				PUBLIC_SERVER: $app.stage !== 'production' ? 'http://localhost:4848' : viewSyncer.url
			}
		});

		new command.local.Command(
			'zero-deploy-permissions',
			{
				dir: join(process.cwd()),
				// Connection string to upstream comes from ZERO_UPSTREAM_DB. See --help.
				create: `npx zero-deploy-permissions --schema-path ./src/schema.ts`,
				// Run the Command on every deploy ...
				triggers: [Date.now()],
				environment: {
					ZERO_UPSTREAM_DB: DB_CONNECTION_STRING
				}
			},

			// after the view-syncer is deployed.
			{ dependsOn: viewSyncer }
		);
	}
});
