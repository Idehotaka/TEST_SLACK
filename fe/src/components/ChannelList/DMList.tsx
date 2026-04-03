"use client";

import { useAuth } from "@/context/Authcontext";
import { getDmConversations, DmConversationItem } from "@/lib/api/dm";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import NewDmModal from "../DmPage/NewDmModal";
import SidebarSection from "./SidebarSection";

export default function DMList() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const workspaceId = Array.isArray(params.workspaceId)
        ? params.workspaceId[0]
        : params.workspaceId;

    const [conversations, setConversations] = useState<DmConversationItem[]>([]);
    const [showModal, setShowModal] = useState(false);

    const loadConversations = () => {
        if (!workspaceId || !user?.id) return;
        getDmConversations(workspaceId, user.id)
            .then(setConversations)
            .catch(console.error);
    };

    useEffect(() => {
        loadConversations();
    }, [workspaceId, user?.id]);

    const getAvatarUrl = (avatar: string | undefined) =>
        `${process.env.NEXT_PUBLIC_SOCKET_URL ?? ""}${avatar ?? "/uploads/avatar.png"}`;

    const getDisplayName = (conv: DmConversationItem) =>
        conv.otherUser?.dispname || conv.otherUser?.email || "Unknown";

    const handleModalClose = () => {
        setShowModal(false);
        // Refresh list after creating a new DM
        loadConversations();
    };

    return (
        <>
            <SidebarSection title="Direct Messages" onAdd={() => setShowModal(true)}>
                {conversations.length === 0 ? (
                    <p className="px-7 text-xs text-white/50 py-1">No direct messages yet</p>
                ) : (
                    conversations.map((conv) => {
                        const isActive =
                            typeof window !== "undefined" &&
                            window.location.pathname.includes(conv.id);

                        return (
                            <button
                                key={conv.id}
                                onClick={() => router.push(`/${workspaceId}/dm/${conv.id}`)}
                                className={`group w-full flex items-center gap-2 px-7 py-1 rounded cursor-pointer text-left ${
                                    isActive
                                        ? "bg-[#f9edff] text-[#39063a] font-medium"
                                        : "hover:bg-white/10 text-white/80"
                                }`}
                            >
                                <img
                                    src={getAvatarUrl(conv.otherUser?.avatar)}
                                    alt={getDisplayName(conv)}
                                    className="w-5 h-5 rounded shrink-0"
                                />
                                <span className="text-sm truncate">{getDisplayName(conv)}</span>
                            </button>
                        );
                    })
                )}

                <button
                    onClick={() => setShowModal(true)}
                    className="group flex items-center gap-2 px-7 py-1 rounded cursor-pointer hover:bg-white/10 text-white/80 w-full text-left"
                >
                    <FiPlus size={14} />
                    <span className="text-sm">New message</span>
                </button>
            </SidebarSection>

            {showModal && <NewDmModal onClose={handleModalClose} />}
        </>
    );
}
