import { query } from '$lib/server/db';
import { nanoid } from 'nanoid';

export type Chat = {
	id: string;
	userId: string;
	title: string;
	isShared: boolean;
	shareMode?: string | null;
	shareId?: string | null;
	createdAt: number;
	updatedAt: number;
};

export type Message = {
	id: string;
	chatId: string;
	role: string;
	content: string;
	isComplete: boolean;
	createdAt: number;
	updatedAt: number;
};

/**
 * Creates a new chat in the database
 */
export async function createChat(userId: string, title: string): Promise<Chat> {
	const chatId = nanoid();
	const now = Date.now();

	const chat: Chat = {
		id: chatId,
		userId,
		title,
		isShared: false,
		shareMode: null,
		shareId: null,
		createdAt: now,
		updatedAt: now
	};

	await query(
		'INSERT INTO chats (id, user_id, title, is_shared, share_mode, share_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
		[chatId, userId, title, false, null, null, new Date(now), new Date(now)]
	);

	return chat;
}

/**
 * Retrieves a specific chat by ID
 */
export async function getChat(chatId: string): Promise<Chat | null> {
	const result = await query('SELECT * FROM chats WHERE id = $1', [chatId]);

	if (result.rows.length === 0) {
		return null;
	}

	const row = result.rows[0];
	return {
		id: row.id,
		userId: row.user_id,
		title: row.title,
		isShared: row.is_shared,
		shareMode: row.share_mode,
		shareId: row.share_id,
		createdAt: new Date(row.created_at).getTime(),
		updatedAt: new Date(row.updated_at).getTime()
	};
}

/**
 * Updates a chat's title
 */
export async function updateChatTitle(chatId: string, title: string): Promise<void> {
	const now = Date.now();
	console.log('UPDATE_CHAT TITELE');
	await query('UPDATE chats SET title = $1, updated_at = $2 WHERE id = $3', [
		title,
		new Date(now),
		chatId
	]);
}

/**
 * Sets a chat's sharing settings
 */
export async function updateChatSharing(
	chatId: string,
	isShared: boolean,
	shareMode?: 'read' | 'write',
	shareId?: string
): Promise<void> {
	const shareIdToUse = shareId || (isShared ? nanoid() : null);
	const now = Date.now();

	await query(
		'UPDATE chats SET is_shared = $1, share_mode = $2, share_id = $3, updated_at = $4 WHERE id = $5',
		[isShared, isShared ? shareMode : null, isShared ? shareIdToUse : null, new Date(now), chatId]
	);
}

/**
 * Retrieves all chats for a user
 */
export async function getUserChats(userId: string): Promise<Chat[]> {
	const result = await query('SELECT * FROM chats WHERE user_id = $1 ORDER BY updated_at DESC', [
		userId
	]);

	return result.rows.map((row) => ({
		id: row.id,
		userId: row.user_id,
		title: row.title,
		isShared: row.is_shared,
		shareMode: row.share_mode,
		shareId: row.share_id,
		createdAt: new Date(row.created_at).getTime(),
		updatedAt: new Date(row.updated_at).getTime()
	}));
}

/**
 * Retrieves a chat by its share ID
 */
export async function getChatByShareId(shareId: string): Promise<Chat | null> {
	const result = await query('SELECT * FROM chats WHERE share_id = $1', [shareId]);

	if (result.rows.length === 0) {
		return null;
	}

	const row = result.rows[0];
	return {
		id: row.id,
		userId: row.user_id,
		title: row.title,
		isShared: row.is_shared,
		shareMode: row.share_mode,
		shareId: row.share_id,
		createdAt: new Date(row.created_at).getTime(),
		updatedAt: new Date(row.updated_at).getTime()
	};
}

/**
 * Creates a new message in a chat
 */
export async function createMessage(
	chatId: string,
	role: string,
	content: string,
	isComplete = true
): Promise<Message> {
	console.log('CREATE_MESSAGE');
	const messageId = nanoid();
	const now = Date.now();

	const message: Message = {
		id: messageId,
		chatId,
		role,
		content,
		isComplete,
		createdAt: now,
		updatedAt: now
	};

	await query(
		'INSERT INTO messages (id, chat_id, role, content, is_complete, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
		[messageId, chatId, role, content, isComplete, new Date(now), new Date(now)]
	);

	// Update the chat's updated timestamp
	await query('UPDATE chats SET updated_at = $1 WHERE id = $2', [new Date(now), chatId]);

	return message;
}

/**
 * Creates an empty assistant message to be filled in via streaming updates
 */
export async function createEmptyAssistantMessage(chatId: string): Promise<Message> {
	return await createMessage(chatId, 'assistant', '', false);
}

/**
 * Updates a message's content
 */
export async function updateMessageContent(messageId: string, content: string): Promise<void> {
	const now = Date.now();
	await query('UPDATE messages SET content = $1, updated_at = $2 WHERE id = $3', [
		content,
		new Date(now),
		messageId
	]);
}

/**
 * Appends content to an existing message
 */
export async function appendToMessage(messageId: string, content: string): Promise<void> {
	const result = await query('SELECT content FROM messages WHERE id = $1', [messageId]);

	if (result.rows.length === 0) {
		throw new Error(`Message not found: ${messageId}`);
	}

	const updatedContent = result.rows[0].content + content;
	await updateMessageContent(messageId, updatedContent);
}

/**
 * Marks a message as complete
 */
export async function markMessageComplete(messageId: string): Promise<void> {
	const now = Date.now();
	await query('UPDATE messages SET is_complete = true, updated_at = $1 WHERE id = $2', [
		new Date(now),
		messageId
	]);
}

/**
 * Gets all messages for a chat
 */
export async function getChatMessages(chatId: string): Promise<Message[]> {
	const result = await query('SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [
		chatId
	]);

	return result.rows.map((row) => ({
		id: row.id,
		chatId: row.chat_id,
		role: row.role,
		content: row.content,
		isComplete: row.is_complete,
		createdAt: new Date(row.created_at).getTime(),
		updatedAt: new Date(row.updated_at).getTime()
	}));
}

/**
 * Deletes a chat and all its messages
 */
export async function deleteChat(chatId: string): Promise<void> {
	// Delete all messages first (foreign key constraint should handle this, but to be safe)
	await query('DELETE FROM messages WHERE chat_id = $1', [chatId]);

	// Delete the chat
	await query('DELETE FROM chats WHERE id = $1', [chatId]);
}

/**
 * Searches for chats by title
 */
export async function searchChats(userId: string, searchQuery: string): Promise<Chat[]> {
	if (!searchQuery) {
		return getUserChats(userId);
	}

	const result = await query(
		"SELECT * FROM chats WHERE user_id = $1 AND LOWER(title) LIKE '%' || LOWER($2) || '%' ORDER BY updated_at DESC",
		[userId, searchQuery]
	);

	return result.rows.map((row) => ({
		id: row.id,
		userId: row.user_id,
		title: row.title,
		isShared: row.is_shared,
		shareMode: row.share_mode,
		shareId: row.share_id,
		createdAt: new Date(row.created_at).getTime(),
		updatedAt: new Date(row.updated_at).getTime()
	}));
}
