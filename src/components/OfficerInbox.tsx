"use client";

import styled, { keyframes } from "styled-components";
import { useEffect, useState } from "react";
import ChatWindow from "@/components/ChatWindow";
import { Conversation, subscribeToConversations } from "@/lib/chat";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1.25rem;
  animation: ${fadeIn} 0.3s ease;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const ListPanel = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 16px;
  padding: 1rem;
  max-height: 600px;
  overflow-y: auto;
`;

const ListTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 800;
  color: white;
  margin-bottom: 0.85rem;
`;

const ConvRow = styled.button<{ $active: boolean; $unread: boolean }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  border: 1px solid ${p => (p.$active ? "rgba(160,120,255,0.6)" : "transparent")};
  background: ${p => (p.$active ? "rgba(120,80,255,0.12)" : "rgba(255,255,255,0.03)")};
  cursor: pointer;
  text-align: left;
  margin-bottom: 0.4rem;
`;

const ConvName = styled.div<{ $unread: boolean }>`
  font-size: 0.85rem;
  font-weight: ${p => (p.$unread ? 800 : 600)};
  color: white;
`;

const ConvPreview = styled.div<{ $unread: boolean }>`
  font-size: 0.75rem;
  color: ${p => (p.$unread ? "rgba(180,150,255,0.9)" : "rgba(255,255,255,0.4)")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EmptyState = styled.p`
  font-size: 0.82rem;
  color: rgba(255,255,255,0.35);
`;

const EmptyChat = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 420px;
  color: rgba(255,255,255,0.35);
  font-size: 0.9rem;
  background: rgba(255,255,255,0.02);
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 16px;
`;

type Props = {
  currentUid: string;
};

export default function OfficerInbox({ currentUid }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToConversations(currentUid, setConversations);
    return () => unsub();
  }, [currentUid]);

  const active = conversations.find(c => c.id === activeId) || null;

  function otherUidOf(conv: Conversation) {
    return conv.participants.find(p => p !== currentUid)!;
  }

  return (
    <Wrapper>
      <ListPanel>
        <ListTitle>Messages ({conversations.length})</ListTitle>

        {conversations.length === 0 ? (
          <EmptyState>Aucune conversation pour le moment.</EmptyState>
        ) : (
          conversations.map(conv => {
            const otherUid = otherUidOf(conv);
            const unread = conv.unreadBy?.includes(currentUid);
            return (
              <ConvRow
                key={conv.id}
                $active={conv.id === activeId}
                $unread={!!unread}
                onClick={() => setActiveId(conv.id)}
              >
                <ConvName $unread={!!unread}>
                  {conv.participantNames?.[otherUid] || "Utilisateur"}
                  {unread && " 🔵"}
                </ConvName>
                <ConvPreview $unread={!!unread}>
                  {conv.lastMessage || "Nouvelle conversation"}
                </ConvPreview>
              </ConvRow>
            );
          })
        )}
      </ListPanel>

      {active ? (
        <ChatWindow
          conversationId={active.id}
          currentUid={currentUid}
          otherUid={otherUidOf(active)}
          otherName={active.participantNames?.[otherUidOf(active)] || "Utilisateur"}
        />
      ) : (
        <EmptyChat>Sélectionnez une conversation pour l'ouvrir.</EmptyChat>
      )}
    </Wrapper>
  );
}