import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Unsubscribe,
} from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────

export type Poste = "president" | "tresorier" | "secretaire";

export type Officer = {
  uid: string;
  pseudo: string;
  prenom: string;
  nom: string;
  avatar: string;
  poste: Poste;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
};

export type Conversation = {
  id: string;
  participants: [string, string];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageAt: any;
  lastMessageSenderId: string;
  unreadBy: string[];
  createdAt: any;
};

const POSTES: Poste[] = ["president", "tresorier", "secretaire"];

// ─── Récupère les 3 responsables de l'association ──────────────────────────

export async function fetchOfficers(): Promise<Officer[]> {
  const q = query(collection(db, "users"), where("poste", "in", POSTES));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data() as any;
    return {
      uid: d.id,
      pseudo: data.pseudo || `${data.prenom || ""} ${data.nom || ""}`.trim(),
      prenom: data.prenom || "",
      nom: data.nom || "",
      avatar: data.avatar || "",
      poste: data.poste as Poste,
    };
  });
}

// ─── Id déterministe pour une conversation entre 2 utilisateurs ────────────

export function getConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

// ─── Récupère (ou crée) la conversation entre l'utilisateur et un officier ─

export async function getOrCreateConversation(
  currentUid: string,
  currentName: string,
  otherUid: string,
  otherName: string
): Promise<string> {
  const id = getConversationId(currentUid, otherUid);
  const ref = doc(db, "conversations", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      participants: [currentUid, otherUid],
      participantNames: {
        [currentUid]: currentName,
        [otherUid]: otherName,
      },
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: "",
      unreadBy: [],
      createdAt: serverTimestamp(),
    });
  }

  return id;
}

// ─── Écoute en temps réel des messages d'une conversation ──────────────────

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
  });
}

// ─── Écoute en temps réel de la liste des conversations d'un utilisateur ───

export function subscribeToConversations(
  uid: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid),
    orderBy("lastMessageAt", "desc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Conversation[]);
  });
}

// ─── Envoi d'un message ─────────────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  senderId: string,
  recipientId: string,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: trimmed.slice(0, 200),
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: senderId,
    unreadBy: arrayUnion(recipientId),
  });
}

// ─── Marquer une conversation comme lue ─────────────────────────────────────

export async function markConversationRead(conversationId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "conversations", conversationId), {
    unreadBy: arrayRemove(uid),
  });
}

export function posteLabel(poste: Poste): string {
  if (poste === "president") return "Président";
  if (poste === "tresorier") return "Trésorier";
  return "Secrétaire";
}