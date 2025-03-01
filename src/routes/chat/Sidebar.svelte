<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { z } from '$lib/z.svelte';
	import { nanoid } from 'nanoid';
	import { Query } from 'zero-svelte';

	const chats = $derived(
		new Query(z.current.query.chats.where('userId', z.current.userID).orderBy('updatedAt', 'desc'))
	);

	function new_chat() {
		const new_id = nanoid();
		z.current.mutate.chats.insert({
			title: 'new chat',
			id: nanoid(),
			userId: z.current.userID,
			isShared: false,
			createdAt: Date.now(),
			updatedAt: Date.now()
		});

		goto('/chat/' + new_id);
	}
</script>

<aside class="sidebar">
	<button onclick={new_chat} class="new-chat-button">New Chat</button>
	<ul>
		{#each chats.current as chat}
			<li>
				<a class:active={chat.id === page.params.id} href="/chat/{chat.id}">{chat.title}</a>
			</li>
		{/each}
	</ul>
</aside>

<style>
	.sidebar {
		background-color: var(--bg-light);
		padding: 20px;
		border-right: solid 1px var(--border);
		display: flex;
		flex-direction: column;
	}

	.new-chat-button {
		padding: 10px 20px;
		background-color: var(--primary);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.new-chat-button:hover {
		background-color: var(--primary-dark);
	}

	ul {
		list-style: none;
		margin: 2rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	li a {
		padding: 10px 5px;
		display: block;
		border-radius: 5px;
		text-decoration: none;
		color: var(--text);
		&.active {
			background: var(--bg-lighter);
		}
	}
</style>
