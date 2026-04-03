"use client";

import { useAuth } from "@/context/Authcontext";
import { useSocket } from "@/providers/SocketProvider";
import { getDmMessages, getDmConversations, DmMessageItem, DmConversationItem } from "@/lib/api/dm";
import DOMPurify from "dompurify";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DmEditor from "@/components/DmPage/DmEditor";

interface DmPageProps {
    conversationId: string;
}

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

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

    const getDisplayName = (sender: DmMessageItem["sender"]) =>
        sender?.dispname || sender?.email || "User";

    const getAvatarUrl = (sender: DmMessageItem["sender"]) =>
        `${process.env.NEXT_PUBLIC_SOCKET_URL ?? ""}${sender?.avatar ?? "/uploads/avatar.png"}`;

    const otherUserName =
        conversation?.otherUser?.dispname ||
        conversation?.otherUser?.email ||
        "Direct Message";

    const otherUserAvatar = conversation?.otherUser?.avatar
        ? `${process.env.NEXT_PUBLIC_SOCKET_URL ?? ""}${conversation.otherUser.avatar}`
        : null;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header — shows the other user's name */}
            <div className="px-6 py-3 border-b border-gray-200 shrink-0 flex items-center gap-3">
                {otherUserAvatar && (
                    <img
                        src={otherUserAvatar}
                        alt={otherUserName}
                        className="w-7 h-7 rounded-lg"
                    />
                )}
                <h2 className="font-semibold text-gray-800 text-base">{otherUserName}</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto flex flex-col px-4 py-2">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Loading messages...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        No messages yet. Say hello!
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex gap-3 px-2 py-2 hover:bg-gray-50 rounded">
                            <img
                                src={getAvatarUrl(msg.sender)}
                                alt={getDisplayName(msg.sender)}
                                className="w-9 h-9 rounded-lg shrink-0"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900 text-sm">
                                        {getDisplayName(msg.sender)}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {formatTime(msg.createdAt)}
                                    </span>
                                </div>
                                <div
                                    className="text-gray-800 text-sm mt-0.5"
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(msg.content),
                                    }}
                                />
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Editor */}
            <div className="shrink-0 px-4 pb-4 pt-2 border-t border-gray-100">
                <DmEditor
                    userData={user}
                    conversationId={conversationId}
                    onMessageSent={(msg: DmMessageItem) =>
                        setMessages((prev) => [...prev, msg])
                    }
                />
            </div>
        </div>
    );
}
