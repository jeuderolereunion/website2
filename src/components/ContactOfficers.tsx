"use client";

import styled, { keyframes } from "styled-components";
import { useEffect, useState } from "react";
import ChatWindow from "@/components/ChatWindow";
import {
  Officer,
  fetchOfficers,
  getOrCreateConversation,
  posteLabel,
} from "@/lib/chat";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Panel = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 16px;
  padding: 1.5rem;
  animation: ${fadeIn} 0.3s ease;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.1rem;
`;

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 800;
  color: white;
  margin-bottom: 0.25rem;
`;

const Subtitle = styled.p`
  font-size: 0.82rem;
  color: rgba(255,255,255,0.45);
`;

const BackBtn = styled.button`
  flex-shrink: 0;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.6);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(255,255,255,0.08);
    color: white;
  }
`;

const OfficerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const OfficerRow = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: rgba(160,120,255,0.5);
    background: rgba(120,80,255,0.08);
  }
`;

const Avatar = styled.div<{ $url?: string }>`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: ${p =>
    p.$url ? `url(${p.$url}) center/cover` : "linear-gradient(135deg, rgba(120,80,255,0.8), rgba(80,40,200,0.9))"};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
`;

const OfficerName = styled.div`
  font-size: 0.88rem;
  font-weight: 700;
  color: white;
`;

const OfficerPoste = styled.div`
  font-size: 0.75rem;
  color: rgba(180,150,255,0.9);
`;

const EmptyState = styled.p`
  font-size: 0.82rem;
  color: rgba(255,255,255,0.35);
`;

type Props = {
  currentUid: string;
  currentName: string;
};

export default function ContactOfficers({ currentUid, currentName }: Props) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ conversationId: string; officer: Officer } | null>(null);

  useEffect(() => {
    fetchOfficers()
      .then(setOfficers)
      .finally(() => setLoading(false));
  }, []);

  function initials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase())
      .join("");
  }

  async function openChat(officer: Officer) {
    const convId = await getOrCreateConversation(
      currentUid,
      currentName,
      officer.uid,
      officer.pseudo
    );
    setActiveChat({ conversationId: convId, officer });
  }

  return (
    <Panel>
      <HeaderRow>
        <div>
          <Title>💬 Besoin d'un coup de main ?</Title>
          {!activeChat && (
            <Subtitle>
              En tant que débutant, vous pouvez échanger directement et en privé avec un membre du bureau de l'association.
            </Subtitle>
          )}
        </div>
        {activeChat && (
          <BackBtn onClick={() => setActiveChat(null)}>← Retour</BackBtn>
        )}
      </HeaderRow>

      {activeChat ? (
        <ChatWindow
          conversationId={activeChat.conversationId}
          currentUid={currentUid}
          otherUid={activeChat.officer.uid}
          otherName={activeChat.officer.pseudo}
          otherSubtitle={posteLabel(activeChat.officer.poste)}
        />
      ) : loading ? (
        <EmptyState>Chargement…</EmptyState>
      ) : officers.length === 0 ? (
        <EmptyState>Aucun membre du bureau n'est disponible pour le moment.</EmptyState>
      ) : (
        <OfficerList>
          {officers.map(o => (
            <OfficerRow key={o.uid} onClick={() => openChat(o)}>
              <Avatar $url={o.avatar}>
                {!o.avatar && initials(o.pseudo)}
              </Avatar>
              <div>
                <OfficerName>{o.pseudo}</OfficerName>
                <OfficerPoste>{posteLabel(o.poste)}</OfficerPoste>
              </div>
            </OfficerRow>
          ))}
        </OfficerList>
      )}
    </Panel>
  );
}