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
			id: new_id,
			userId: z.current.userID,
			isShared: false,
			createdAt: Date.now(),
			updatedAt: Date.now()
		});

		goto('/chat/' + new_id);
	}

	function goToChat(id: string, e: Event) {
		e.preventDefault();
		goto('/chat/' + id);
	}
</script>

<aside class="sidebar">
	<button onclick={new_chat} class="new-chat-button">New Chat</button>
	<ul>
		{#each chats.current as chat}
			<li>
				<a
					class={chat.id === page.params.id ? 'active' : ''}
					href="/chat/{chat.id}"
					onclick={(e) => goToChat(chat.id, e)}
				>
					<span class="chat-title">{chat.title}</span>
					{#if chat.isShared}
						<span
							class="shared-indicator"
							title="Shared: {chat.shareMode === 'read' ? 'Read-only' : 'Read-write'}"
						>
							{chat.shareMode === 'read' ? '👁️' : '✏️'}
						</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
</aside>

<style>
	.sidebar {
		background-color: var(--bg);
		padding: 20px;
		border-right: solid 1px var(--border);
		display: flex;
		flex-direction: column;
		box-shadow: inset -4px 0px 10px rgb(0 0 0 / 0.3);
	}

	.new-chat-button {
		padding: 8px 8px;
		background-color: var(--primary);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		box-shadow: 1px 1px 3px rgb(0 0 0 / 0.3);
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
		gap: 5px;
	}
	li {
		a {
			padding: 8px 8px;
			display: flex;
			justify-content: space-between;
			align-items: center;
			border-radius: 5px;
			text-decoration: none;
			color: var(--text);
			transition: 0.2s ease all;
			&.active,
			&:hover {
				background: var(--bg-lighter);
				box-shadow: 1px 1px 3px rgb(0 0 0 / 0.3);
			}
		}
	}

	.chat-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.shared-indicator {
		margin-left: 8px;
		font-size: 0.9em;
	}
</style>
