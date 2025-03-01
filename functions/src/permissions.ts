import { execSync } from 'node:child_process';

export const deploy = () => {
	console.log('Starting zero-deploy-permissions');
	try {
		const result = execSync('npx zero-deploy-permissions', { stdio: 'pipe' }).toString();
		console.log('Command output:', result);
	} catch (error) {
		console.error('Error executing zero-deploy-permissions:', error);
		throw error;
	}
};
