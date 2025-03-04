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

// Define reusable permission functions
const allowIfChatOwner = (authData: AuthData, { cmp }: ExpressionBuilder<Schema, 'chats'>) =>
	cmp('userId', '=', authData.sub);

const allowIfChatSharedReadable = (
	authData: AuthData,
	{ cmp, and, or }: ExpressionBuilder<Schema, 'chats'>
) =>
	and(
		cmp('isShared', '=', true),
		or(cmp('shareMode', '=', 'read'), cmp('shareMode', '=', 'write'))
	);

const allowIfMessageOwner = (authData: AuthData, { cmp }: ExpressionBuilder<Schema, 'messages'>) =>
	cmp('userId', '=', authData.sub);

const allowIfReadbleChat = (
	authData: AuthData,
	{ exists }: ExpressionBuilder<Schema, 'messages'>
) => exists('chat', (q) => q.where('isShared', true));

const allowIfInWritableChat = (
	authData: AuthData,
	{ exists }: ExpressionBuilder<Schema, 'messages'>
) => exists('chat', (q) => q.where('isShared', true).where('shareMode', 'write'));

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
	return {
		chats: {
			row: {
				select: [allowIfChatOwner, allowIfChatSharedReadable],
				insert: [(authData, eb, row) => eb.cmp('userId', '=', row.userId)],
				update: {
					preMutation: [allowIfChatOwner],
					postMutation: [(authData, eb, row, prev) => eb.cmp('userId', '=', prev.userId)]
				},
				delete: [allowIfChatOwner]
			}
		},
		messages: {
			row: {
				select: [allowIfMessageOwner, allowIfReadbleChat],
				insert: [(authData, eb, row) => eb.cmp('userId', '=', row.userId), allowIfInWritableChat],
				update: {
					preMutation: [allowIfMessageOwner],
					postMutation: [(authData, eb, row, prev) => eb.cmp('userId', '=', prev.userId)]
				},
				delete: [allowIfMessageOwner]
			}
		}
	};
});

export default {
	schema,
	permissions
};
