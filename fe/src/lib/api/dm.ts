const BASE = process.env.NEXT_PUBLIC_SOCKET_URL ?? '';

export interface DmCandidate {
    id: string;
    dispname: string | null;
    email: string;
    avatar: string;
}

export interface DmConversationItem {
    id: string;
    otherUser: {
        id: string;
        dispname: string | null;
        email: string;
        avatar: string;
    } | null;
    latestMessage: {
        id: string;
        content: string;
        createdAt: string;
        senderId: string;
    } | null;
    updatedAt: string;
    lastMessageAt: string | null;
}

export interface DmMessageItem {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    sender: {
        id: string;
        dispname: string | null;
        avatar: string;
        email: string;
    };
}

function authHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
}

/** Workspace members available as DM targets (excludes current user) */
export async function getDmCandidates(
    workspaceId: string,
    currentUserId: string,
): Promise<DmCandidate[]> {
    const res = await fetch(
        `${BASE}/api/workspaces/${workspaceId}/dm/candidates?currentUserId=${currentUserId}`,
        { headers: authHeaders() },
    );
    if (!res.ok) throw new Error('Failed to fetch DM candidates');
    return res.json();
}

/** List all DM conversations for the current user in a workspace */
export async function getDmConversations(
    workspaceId: string,
    currentUserId: string,
): Promise<DmConversationItem[]> {
    const res = await fetch(
        `${BASE}/api/workspaces/${workspaceId}/dm/conversations?currentUserId=${currentUserId}`,
        { headers: authHeaders() },
    );
    if (!res.ok) throw new Error('Failed to fetch DM conversations');
    return res.json();
}

/** Create or retrieve a one-to-one DM conversation */
export async function getOrCreateDmConversation(
    workspaceId: string,
    currentUserId: string,
    targetUserId: string,
): Promise<{ id: string }> {
    const res = await fetch(
        `${BASE}/api/workspaces/${workspaceId}/dm/conversations`,
        {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ currentUserId, targetUserId }),
        },
    );
    if (!res.ok) throw new Error('Failed to create DM conversation');
    return res.json();
}

/** Fetch messages for a DM conversation */
export async function getDmMessages(
    workspaceId: string,
    conversationId: string,
    currentUserId: string,
): Promise<DmMessageItem[]> {
    const res = await fetch(
        `${BASE}/api/workspaces/${workspaceId}/dm/conversations/${conversationId}/messages?currentUserId=${currentUserId}`,
        { headers: authHeaders() },
    );
    if (!res.ok) throw new Error('Failed to fetch DM messages');
    return res.json();
}
