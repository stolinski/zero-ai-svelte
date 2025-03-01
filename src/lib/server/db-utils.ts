/**
 * Utility functions for database operations
 */

/**
 * Converts a JavaScript timestamp (milliseconds since epoch) to a PostgreSQL compatible date string
 * This is used when receiving timestamps from the client via Zero.js
 *
 * @param jsTimestamp - JavaScript timestamp (milliseconds since epoch)
 * @returns PostgreSQL compatible date string or null if input is invalid
 */
export function jsTimestampToPostgresDate(jsTimestamp: number): string | null {
	if (!jsTimestamp || isNaN(jsTimestamp)) {
		return null;
	}

	try {
		// Convert milliseconds to ISO string that Postgres can understand
		const date = new Date(jsTimestamp);
		return date.toISOString();
	} catch (error) {
		console.error('Error converting timestamp:', error);
		return null;
	}
}

/**
 * Converts a PostgreSQL timestamp to a JavaScript timestamp (milliseconds since epoch)
 * This is used when sending data back to the client via Zero.js
 *
 * @param pgTimestamp - PostgreSQL timestamp
 * @returns JavaScript timestamp (milliseconds since epoch) or null if input is invalid
 */
export function postgresDateToJsTimestamp(pgTimestamp: Date | string): number | null {
	if (!pgTimestamp) {
		return null;
	}

	try {
		// If it's already a Date object
		if (pgTimestamp instanceof Date) {
			return pgTimestamp.getTime();
		}

		// If it's a string representation of a date
		const date = new Date(pgTimestamp);
		return date.getTime();
	} catch (error) {
		console.error('Error converting timestamp:', error);
		return null;
	}
}
