"use client";

import { useParams } from "next/navigation";
import DmPage from "@/components/DmPage/DmPage";

export default function Page() {
    const params = useParams();
    const conversationId = Array.isArray(params.conversationId)
        ? params.conversationId[0]
        : params.conversationId;

    if (!conversationId) return null;

    return <DmPage conversationId={conversationId} />;
}
