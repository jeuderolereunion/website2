"use client";

import styled, { keyframes } from "styled-components";
import { useEffect, useRef, useState } from "react";
import {
  ChatMessage,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
} from "@/lib/chat";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 420px;
  max-height: 600px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 16px;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 0.9rem 1.1rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const HeaderName = styled.div`
  font-weight: 700;
  font-size: 0.92rem;
  color: white;
`;

const HeaderSub = styled.div`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
`;

const CloseBtn = styled.button`
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  font-size: 1.1rem;
  cursor: pointer;
  line-height: 1;
  padding: 0.25rem;

  &:hover { color: white; }
`;

const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EmptyState = styled.div`
  margin: auto;
  text-align: center;
  color: rgba(255,255,255,0.35);
  font-size: 0.85rem;
  padding: 1rem;
`;

const Bubble = styled.div<{ $mine: boolean }>`
  align-self: ${p => (p.$mine ? "flex-end" : "flex-start")};
  max-width: 78%;
  padding: 0.6rem 0.85rem;
  border-radius: 14px;
  border-bottom-right-radius: ${p => (p.$mine ? "4px" : "14px")};
  border-bottom-left-radius: ${p => (p.$mine ? "14px" : "4px")};
  background: ${p =>
    p.$mine
      ? "linear-gradient(135deg, rgba(120,80,255,0.85), rgba(80,40,200,0.9))"
      : "rgba(255,255,255,0.07)"};
  color: white;
  font-size: 0.88rem;
  line-height: 1.4;
  word-break: break-word;
  animation: ${fadeIn} 0.2s ease;
`;

const InputBar = styled.form`
  display: flex;
  gap: 0.6rem;
  padding: 0.85rem;
  border-top: 1px solid rgba(255,255,255,0.08);
`;

const TextInput = styled.input`
  flex: 1;
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.06);
  color: white;
  font-size: 0.9rem;
  outline: none;

  &::placeholder { color: rgba(255,255,255,0.25); }

  &:focus {
    border-color: rgba(160,120,255,0.6);
  }
`;

const SendBtn = styled.button`
  padding: 0 1.1rem;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, rgba(120,80,255,0.85), rgba(80,40,200,0.9));
  color: white;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

type Props = {
  conversationId: string;
  currentUid: string;
  otherUid: string;
  otherName: string;
  otherSubtitle?: string;
  onClose?: () => void;
};

export default function ChatWindow({
  conversationId,
  currentUid,
  otherUid,
  otherName,
  otherSubtitle,
  onClose,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToMessages(conversationId, setMessages);
    markConversationRead(conversationId, currentUid).catch(() => {});
    return () => unsub();
  }, [conversationId, currentUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;

    setSending(true);
    setText("");
    try {
      await sendMessage(conversationId, currentUid, otherUid, value);
    } finally {
      setSending(false);
    }
  }

  return (
    <Wrapper>
      <Header>
        <div>
          <HeaderName>{otherName}</HeaderName>
          {otherSubtitle && <HeaderSub>{otherSubtitle}</HeaderSub>}
        </div>
        {onClose && <CloseBtn onClick={onClose} aria-label="Fermer">✕</CloseBtn>}
      </Header>

      <MessagesArea>
        {messages.length === 0 && (
          <EmptyState>
            Envoyez le premier message pour démarrer la conversation.
          </EmptyState>
        )}
        {messages.map(m => (
          <Bubble key={m.id} $mine={m.senderId === currentUid}>
            {m.text}
          </Bubble>
        ))}
        <div ref={bottomRef} />
      </MessagesArea>

      <InputBar onSubmit={handleSend}>
        <TextInput
          placeholder="Votre message…"
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={3000}
        />
        <SendBtn type="submit" disabled={!text.trim() || sending}>
          Envoyer
        </SendBtn>
      </InputBar>
    </Wrapper>
  );
}