"use client";

import { useAuth } from "@/context/Authcontext";
import { useSocket } from "@/providers/SocketProvider";
import {
    getDmMessages,
    getDmConversations,
    DmMessageItem,
    DmConversationItem,
} from "@/lib/api/dm";
import SlackLoader from "@/common/Loading";
import SlackMessage from "@/components/ui/message/Message";
import MessageEditor from "@/components/ui/messageEditor/MessageEditor";
import DividerDate from "@/components/ui/dividerdate/DividerDate";
import { ReactionView } from "@/lib/api/reactions";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface DmPageProps {
    conversationId: string;
}

/**
 * DM conversation view.
 * Reuses SlackMessage (message item) and MessageEditor (editor) from the
 * channel UI — the same components, just driven by DM data instead of
 * channel data. No separate DM-only rendering system.
 */
export default function DmPage({ conversationId }: DmPageProps) {
    const { user } = useAuth();
    const { socket } = useSocket();
    const params = useParams();
    const workspaceId = Array.isArray(params.workspaceId)
        ? params.workspaceId[0]
        : params.workspaceId;

    const [messages, setMessages] = useState<DmMessageItem[]>([]);
    const [conversation, setConversation] = useState<DmConversationItem | null>(null);
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    // Load conversation info (for header) and message history
    useEffect(() => {
        if (!conversationId || !user?.id || !workspaceId) return;
        setLoading(true);

        Promise.all([
            getDmMessages(workspaceId, conversationId, user.id),
            getDmConversations(workspaceId, user.id),
        ])
            .then(([msgs, convs]) => {
                setMessages(msgs);
                const found = convs.find((c) => c.id === conversationId) ?? null;
                setConversation(found);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [conversationId, user?.id, workspaceId]);

    // Join DM room and listen for real-time messages
    useEffect(() => {
        if (!socket || !conversationId) return;

        socket.emit("join_dm", conversationId);

        const handleNewMessage = (msg: DmMessageItem) => {
            setMessages((prev) => [...prev, msg]);
        };

        socket.on("new_dm_message", handleNewMessage);
        return () => {
            socket.off("new_dm_message", handleNewMessage);
        };
    }, [socket, conversationId]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── helpers shared with channel view ──────────────────────────────────────

    const groupMessagesByDate = (msgs: DmMessageItem[]) => {
        const groups: Record<string, DmMessageItem[]> = {};
        msgs.forEach((m) => {
            const date = new Date(m.createdAt).toDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(m);
        });
        return groups;
    };

    const sortedMessages = [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const groupedMessages = groupMessagesByDate(sortedMessages);

    const getDisplayName = (sender: DmMessageItem["sender"]) =>
        sender?.dispname || sender?.email || "User";

    const getAvatarUrl = (sender: DmMessageItem["sender"]) =>
        `${process.env.NEXT_PUBLIC_SOCKET_URL ?? ""}${sender?.avatar ?? "/uploads/avatar.png"}`;

    // DM messages don't use channel reactions — provide a no-op handler so
    // SlackMessage renders correctly without crashing on undefined channelId.
    const handleReactionUpdate = (_messageId: string, _reactions: ReactionView[]) => {
        // Reactions on DM messages are not yet implemented — no-op keeps SlackMessage stable.
    };

    // ── header info ───────────────────────────────────────────────────────────

    const otherUserName =
        conversation?.otherUser?.dispname ||
        conversation?.otherUser?.email ||
        "Direct Message";

    const otherUserAvatar = conversation?.otherUser?.avatar
        ? `${process.env.NEXT_PUBLIC_SOCKET_URL ?? ""}${conversation.otherUser.avatar}`
        : `${process.env.NEXT_PUBLIC_SOCKET_URL ?? ""}/uploads/avatar.png`;

    if (loading) return <SlackLoader />;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* ── Header — mirrors MainTopBar structure for channels ── */}
            <div className="flex items-center gap-3 px-6 h-[49px] border-b border-gray-200 shrink-0">
                <img
                    src={otherUserAvatar}
                    alt={otherUserName}
                    className="w-7 h-7 rounded-lg"
                />
                <span className="font-semibold text-gray-800 text-base">
                    {otherUserName}
                </span>
            </div>

            {/* ── Sub-header bar — mirrors MainBar ── */}
            <div className="w-full h-[44px] border-b border-gray-200 flex items-center px-4 text-gray-500 text-sm shrink-0">
                <span>Direct Message</span>
            </div>

            {/* ── Message list — same scroll container as channel view ── */}
            <div className="flex-1 overflow-y-scroll flex flex-col">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        No messages yet. Say hello!
                    </div>
                ) : (
                    Object.entries(groupedMessages).map(([date, msgs]) => (
                        <div key={date}>
                            {/* Reuse the same date divider as channel view */}
                            <DividerDate date={date} />

                            {msgs.map((item) => (
                                // Reuse SlackMessage — the same component used in channel view.
                                // Pass an empty channelId string; reactions are no-op for DMs.
                                <SlackMessage
                                    key={item.id}
                                    id={`dm-msg-${item.id}`}
                                    state="message"
                                    avatar={getAvatarUrl(item.sender)}
                                    username={getDisplayName(item.sender)}
                                    time={item.createdAt}
                                    text={item.content}
                                    messageId={item.id}
                                    channelId=""
                                    currentUserId={user?.id ?? null}
                                    files={[]}
                                    reactions={[]}
                                    replies={0}
                                    lastReply=""
                                    onCommentClick={() => {}}
                                    onReactionUpdate={handleReactionUpdate}
                                    hideThreadButton
                                />
                            ))}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* ── Editor — reuses MessageEditor in DM mode ── */}
            <div className="w-full z-10 px-4 pb-4 shrink-0">
                <MessageEditor
                    userData={user}
                    dmConversationId={conversationId}
                    placeholder={`Message ${otherUserName}`}
                />
            </div>
        </div>
    );
}
