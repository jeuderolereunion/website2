"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

type Proposition = {
  id: string;
  titre: string;
  description: string;
  categorie: string;
  date: string;
  heure: string;
  niveau: string;
  places: number;
  organisateur: string;
  email: string;
};

export default function AdminEvenementsPage() {
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [loading, setLoading] = useState(true);

  async function chargerPropositions() {
    const snap = await getDocs(collection(db, "propositions_evenements"));

    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Proposition[];

    setPropositions(data);
    setLoading(false);
  }

  useEffect(() => {
    chargerPropositions();
  }, []);

  async function accepterEvenement(event: Proposition) {
    try {
      await addDoc(collection(db, "evenements"), {
        titre: event.titre,
        description: event.description,
        categorie: event.categorie,
        date: event.date,
        heure: event.heure,
        niveau: event.niveau,
        places: event.places,
        inscrits: 0,
      });

      await deleteDoc(
        doc(db, "propositions_evenements", event.id)
      );

      chargerPropositions();

      alert("Événement validé !");
    } catch (error) {
      console.error(error);
      alert("Erreur.");
    }
  }

  async function supprimerEvenement(id: string) {
    if (!confirm("Supprimer cette proposition ?")) return;

    await deleteDoc(doc(db, "propositions_evenements", id));

    chargerPropositions();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0d0d14",
        color: "white",
        padding: "2rem",
      }}
    >
      <h1>Administration des événements</h1>

      <p>
        Propositions en attente : {propositions.length}
      </p>

      {loading && <p>Chargement...</p>}

      {propositions.map((event) => (
        <div
          key={event.id}
          style={{
            background: "#1b1b2b",
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "10px",
          }}
        >
          <h2>{event.titre}</h2>

          <p>{event.description}</p>

          <p>
            📅 {event.date} à {event.heure}
          </p>

          <p>🎲 {event.categorie}</p>

          <p>⭐ {event.niveau}</p>

          <p>👤 {event.organisateur}</p>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            <button
              onClick={() => accepterEvenement(event)}
            >
              ✅ Valider
            </button>

            <button
              onClick={() =>
                supprimerEvenement(event.id)
              }
            >
              ❌ Refuser
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}