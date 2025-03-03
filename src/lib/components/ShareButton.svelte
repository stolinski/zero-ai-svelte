<script lang="ts">
	import { nanoid } from 'nanoid';
	import { z } from '$lib/z.svelte';
	import { Query } from 'zero-svelte';

	let { chatId } = $props();
	const chat = $derived(new Query(z.current.query.chats.where('id', chatId).one()));

	let shareDialog = $state<HTMLDialogElement | null>(null);
	let shareMode = $state<'read' | 'write'>('read');
	let copySuccess = $state(false);
	const baseUrl = window.location.origin;
	let shareURL = $derived(`${baseUrl}/shared/${chat?.current?.shareId || 'generating...'}`);

	// Show message temporarily after successful copy
	function showCopySuccess() {
		copySuccess = true;
		setTimeout(() => {
			copySuccess = false;
		}, 2000);
	}

	// Generate a share link for the current chat
	function generateShareLink(mode: 'read' | 'write' = 'read') {
		console.log('mode', mode);
		if (!chat?.current) return;

		// If chat already has a shareId, use it, otherwise generate one
		if (!chat.current.shareId) {
			const shareId = nanoid();
			z.current.mutate.chats.update({
				id: chat.current.id,
				shareId,
				isShared: true,
				shareMode: mode
			});
		} else if (chat.current.shareMode !== mode) {
			// If share mode changed, update it
			z.current.mutate.chats.update({
				id: chat.current.id,
				isShared: true,
				shareMode: mode
			});
		}
		shareDialog?.showModal();
	}

	// Function to copy share URL to clipboard
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(shareURL);
			showCopySuccess();
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	}

	// Stop sharing a chat
	function stopSharing() {
		if (!chat?.current) return;

		z.current.mutate.chats.update({
			id: chat.current.id,
			isShared: false,
			shareMode: null,
			shareId: null
		});
		shareDialog?.close();
	}

	// Close modal function
	function closeModal() {
		shareDialog?.close();
	}

	// Handle click outside modal
	function handleClickOutside(e: MouseEvent) {
		const dialogDimensions = shareDialog?.getBoundingClientRect();
		if (!dialogDimensions) return;

		if (
			e.clientX < dialogDimensions.left ||
			e.clientX > dialogDimensions.right ||
			e.clientY < dialogDimensions.top ||
			e.clientY > dialogDimensions.bottom
		) {
			closeModal();
		}
	}
</script>

<button
	class="share-button"
	onclick={() => generateShareLink()}
	title={chat?.current?.isShared ? 'Manage Sharing' : 'Share Chat'}
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<circle cx="18" cy="5" r="3"></circle>
		<circle cx="6" cy="12" r="3"></circle>
		<circle cx="18" cy="19" r="3"></circle>
		<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
		<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
	</svg>
	{#if chat?.current?.isShared}
		<span class="share-status">{chat.current.shareMode === 'read' ? '👁️' : '✏️'}</span>
	{/if}
</button>

<!-- Share Dialog -->
<dialog bind:this={shareDialog} onclick={handleClickOutside} class="share-dialog">
	<div class="dialog-content">
		<h2>Share this chat</h2>

		<div class="share-options">
			<label>
				<input
					type="radio"
					bind:group={shareMode}
					value="read"
					onclick={() => generateShareLink()}
				/>
				Read-only (viewers can't add messages)
			</label>

			<label>
				<input
					type="radio"
					bind:group={shareMode}
					value="write"
					onclick={() => generateShareLink('write')}
				/>
				Read-write (viewers can add messages)
			</label>
		</div>

		<div class="share-url-container">
			<input type="text" readonly value={shareURL} class="share-url" />
			<button onclick={copyToClipboard} class="copy-button">
				{copySuccess ? 'Copied!' : 'Copy'}
			</button>
		</div>

		<div class="dialog-actions">
			<button onclick={closeModal} class="cancel-button">Close</button>
			{#if chat?.current?.isShared}
				<button onclick={stopSharing} class="stop-sharing-button">Stop Sharing</button>
			{/if}
		</div>
	</div>
</dialog>

<style>
	.share-button {
		display: inline-flex;
		z-index: 10;
		align-items: center;
		position: fixed;
		inset: 10px 10px auto auto;
		gap: 0.5rem;
		padding: 0.5rem;
		background-color: var(--bg-light);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.share-button:hover {
		background-color: var(--bg-lighter);
		transform: translateY(-1px);
		box-shadow: 0 2px 4px var(--shadow);
	}

	.share-status {
		font-size: 0.875rem;
	}

	/* Dialog styling */
	.share-dialog {
		padding: 0;
		border: none;
		border-radius: 8px;
		box-shadow: 0 4px 6px var(--shadow);
		max-width: 500px;
		width: 90%;
		background: var(--bg);
		color: var(--text);
		position: fixed;
		inset: 0;
		margin: auto;
	}

	.share-dialog::backdrop {
		background: rgb(0 0 0 / 0.5);
	}

	.dialog-content {
		padding: 1.5rem;
	}

	.dialog-content h2 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: var(--text-dark);
	}

	.share-options {
		margin-bottom: 1rem;
	}

	.share-options label {
		display: block;
		margin-bottom: 0.5rem;
		cursor: pointer;
	}

	.share-url-container {
		display: flex;
		margin-bottom: 1.5rem;
	}

	.share-url {
		flex: 1;
		padding: 8px;
		border: 1px solid var(--border);
		border-radius: 4px 0 0 4px;
		background-color: var(--bg-lighter);
	}

	.copy-button {
		padding: 8px 12px;
		background-color: var(--primary);
		color: white;
		border: none;
		border-radius: 0 4px 4px 0;
		cursor: pointer;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	.cancel-button {
		padding: 8px 16px;
		background-color: var(--bg-light);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
	}

	.stop-sharing-button {
		padding: 8px 16px;
		background-color: rgb(220 53 69 / 1);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
