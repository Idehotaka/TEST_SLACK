"use client";

import { useSocket } from "@/providers/SocketProvider";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { IoMdSend } from "react-icons/io";

interface DmEditorProps {
    userData: { id: string; [key: string]: any } | null;
    conversationId: string;
    onMessageSent?: (msg: any) => void;
}

/**
 * Minimal DM message editor.
 * Reuses TipTap (same as MessageEditor) but emits send_dm_message via socket.
 * Kept intentionally simple — the full toolbar is in MessageEditor for channels.
 */
export default function DmEditor({ userData, conversationId, onMessageSent }: DmEditorProps) {
    const { socket } = useSocket();
    const [isEmpty, setIsEmpty] = useState(true);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: "Message..." }),
        ],
        content: "",
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            setIsEmpty(editor.getText().trim().length === 0);
        },
        editorProps: {
            handleKeyDown: (_view, event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                    return true;
                }
                return false;
            },
        },
    });

    const handleSend = () => {
        if (!editor || isEmpty || !socket || !userData?.id || !conversationId) return;

        const content = editor.getHTML();

        socket.emit("send_dm_message", {
            conversationId,
            senderId: userData.id,
            content,
        });

        editor.commands.clearContent();
    };

    if (!editor) return null;

    return (
        <div className="border border-[#e0dada] w-full rounded-[10px] bg-white text-gray-700">
            <EditorContent
                editor={editor}
                className="min-h-[40px] max-h-[200px] overflow-y-auto px-3 py-2 text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror]:border-none"
            />
            <div className="flex justify-end items-center px-2 pb-2">
                <button
                    onClick={handleSend}
                    disabled={isEmpty}
                    className={`flex items-center gap-1 px-2 rounded-md text-sm h-7 transition ${
                        isEmpty
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-green-800 text-white hover:bg-green-700"
                    }`}
                >
                    <IoMdSend size={16} />
                </button>
            </div>
        </div>
    );
}
