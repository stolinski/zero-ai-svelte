import pg from 'pg';

import { ZERO_UPSTREAM_DB } from '$env/static/private';

// Create a standard PostgreSQL connection pool
export const pool = new pg.Pool({
	connectionString: ZERO_UPSTREAM_DB
});

// Function to query the database
export async function query(text: string, params: any[] = []) {
	try {
		const start = Date.now();
		const res = await pool.query(text, params);
		const duration = Date.now() - start;
		console.log('Executed query', { text, duration, rows: res.rowCount });
		return res;
	} catch (error) {
		console.error('Error executing query', { text, error });
		throw error;
	}
}

// Ensure the pool is properly closed when the server shuts down
process.on('SIGTERM', () => {
	pool.end();
});
