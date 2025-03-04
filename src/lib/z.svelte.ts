import { PUBLIC_SERVER } from '$env/static/public';
import { Z } from 'zero-svelte';
import { schema, type Schema } from '../schema';
import { nanoid } from 'nanoid';

function get_or_create_user(): {
	id: string;
	status: 'anon' | 'authenticated';
} {
	const userKey = 'user_data';
	let user = localStorage.getItem(userKey);

	if (!user) {
		user = JSON.stringify({ id: nanoid(), status: 'anon' });
		localStorage.setItem(userKey, user);
	}

	return JSON.parse(user);
}

export function get_z_options() {
	const user = get_or_create_user();

	return {
		userID: user.id ?? 'anon',
		server: PUBLIC_SERVER,
		schema,
		auth: () => {
			return JSON.stringify({ sub: user.id });
		}
	} as const;
}

export const z = new Z<Schema>(get_z_options());
