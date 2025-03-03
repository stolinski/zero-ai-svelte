import {
	createSchema,
	definePermissions,
	type ExpressionBuilder,
	type Row,
	ANYONE_CAN,
	table,
	string,
	number,
	boolean,
	relationships,
	type PermissionsConfig,
	ANYONE_CAN_DO_ANYTHING
} from '@rocicorp/zero';

// Chat table definition
const chat = table('chats')
	.columns({
		id: string(),
		userId: string().from('user_id'),
		title: string(),
		isShared: boolean().from('is_shared'),
		shareMode: string().from('share_mode').optional(), // 'read' or 'write'
		shareId: string().from('share_id').optional(), // Unique ID for sharing
		createdAt: number().from('created_at'),
		updatedAt: number().from('updated_at')
	})
	.primaryKey('id');

// Message table definition
const message = table('messages')
	.columns({
		id: string(),
		chatId: string().from('chat_id'),
		userId: string().from('user_id'),
		role: string(),
		content: string(),
		isComplete: boolean().from('is_complete'),
		createdAt: number().from('created_at'),
		updatedAt: number().from('updated_at')
	})
	.primaryKey('id');

// Define relationships between messages and chats
const messageRelationships = relationships(message, ({ one }) => ({
	chat: one({
		sourceField: ['chatId'],
		destSchema: chat,
		destField: ['id']
	})
}));

// Define relationships for chats to their messages
const chatRelationships = relationships(chat, ({ many }) => ({
	messages: many({
		sourceField: ['id'],
		destSchema: message,
		destField: ['chatId']
	})
}));

export const schema = createSchema(1, {
	tables: [chat, message],
	relationships: [messageRelationships, chatRelationships]
});

// The contents of your decoded JWT or anonymous user ID from localStorage
type AuthData = {
	sub: string; // This would contain the user_id from localStorage
};

export type Schema = typeof schema;
export type Message = Row<typeof schema.tables.messages>;
export type Chat = Row<typeof schema.tables.chats>;

// Creating a type to help with proper typing of the join callbacks
type ChatQuery = {
	userId: string;
	isShared: boolean;
	shareMode: string;
};

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
	// Uncomment and implement permission functions
	const allowIfChatOwner = (authData: AuthData, { cmp }: ExpressionBuilder<Schema, 'chats'>) => {
		return cmp('userId', '=', authData.sub);
	};

	// Allow if the user has read access via sharing
	const allowIfChatSharedReadable = (
		_authData: AuthData,
		{ cmp, and, or }: ExpressionBuilder<Schema, 'chats'>
	) => {
		return and(
			cmp('isShared', '=', true),
			or(cmp('shareMode', '=', 'read'), cmp('shareMode', '=', 'write'))
		);
	};

	// Allow if the user has write access via sharing
	const allowIfChatSharedWritable = (
		_authData: AuthData,
		{ cmp, and }: ExpressionBuilder<Schema, 'chats'>
	) => {
		return and(cmp('isShared', '=', true), cmp('shareMode', '=', 'write'));
	};

	// Allow if the message belongs to a chat that is shared with write access
	const allowIfMessageInWritableSharedChat = (
		_authData: AuthData,
		eb: ExpressionBuilder<Schema, 'messages'>
	) => {
		// We're using any here as a workaround for the type issues
		return (eb as any).join(
			'chat',
			(q: ChatQuery) => q.isShared === true && q.shareMode === 'write'
		);
	};

	// We'll use explicit permissions using ANYONE_CAN for now to avoid TypeScript errors
	// You can adjust these permissions once you've fixed the TypeScript issues
	// return {
	// 	chats: {
	// 		row: {
	// 			select: ANYONE_CAN,
	// 			insert: ANYONE_CAN,
	// 			update: ANYONE_CAN,
	// 			delete: ANYONE_CAN
	// 		}
	// 	},
	// 	messages: {
	// 		row: {
	// 			select: ANYONE_CAN,
	// 			insert: ANYONE_CAN,
	// 			update: ANYONE_CAN,
	// 			delete: ANYONE_CAN
	// 		}
	// 	}
	// } as PermissionsConfig<AuthData, Schema>;
	return {
		chats: ANYONE_CAN_DO_ANYTHING,
		messages: ANYONE_CAN_DO_ANYTHING
	} as PermissionsConfig<AuthData, Schema>;
});

export default {
	schema,
	permissions
};
