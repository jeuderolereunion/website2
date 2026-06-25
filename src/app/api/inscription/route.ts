// ═══════════════════════════════════════════════════════════════════════════════
// FILE: app/api/register-event/route.ts
// DESCRIPTION: API route pour envoyer l'email de confirmation d'inscription
// ═══════════════════════════════════════════════════════════════════════════════

"use server";

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION NODEMAILER
// ═══════════════════════════════════════════════════════════════════════════════

// 🔧 Option 1: GMAIL (le plus simple)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Mot de passe d'app (pas le vrai mot de passe)
  },
});

// 🔧 Option 2: SMTP personnalisé (décommentez si vous n'utilisez pas Gmail)
/*
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
*/

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RegisterEventRequest {
  nom: string;
  email: string;
  eventTitle: string;
  date?: string;
  time?: string;
  mj?: string;           // Optionnel: nom du meneur de jeu
  system?: string;       // Optionnel: système de JDR
  description?: string;  // Optionnel: description de la partie
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE EMAIL HTML
// ═══════════════════════════════════════════════════════════════════════════════

function getEventEmailTemplate(data: RegisterEventRequest): string {
  const {
    nom,
    eventTitle,
    date,
    time,
    mj,
    system,
    description,
  } = data;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: #0d0d14;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 2rem 1rem;
          }
          .card {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.09);
            border-radius: 16px;
            padding: 2rem;
            color: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 2rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.09);
            padding-bottom: 1.5rem;
          }
          .logo {
            font-size: 3rem;
            margin-bottom: 0.5rem;
          }
          h1 {
            font-size: 1.5rem;
            margin: 0.5rem 0;
            color: #c8a8ff;
          }
          .subtitle {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.95rem;
            margin: 0;
          }
          .greeting {
            font-size: 1rem;
            margin: 1.5rem 0 1rem;
            line-height: 1.6;
          }
          .greeting strong {
            color: #c8a8ff;
          }
          .event-details {
            background: rgba(120, 80, 255, 0.15);
            border: 1px solid rgba(160, 120, 255, 0.3);
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1.5rem 0;
          }
          .event-title {
            font-size: 1.2rem;
            font-weight: bold;
            color: #c8a8ff;
            margin: 0 0 1rem 0;
          }
          .event-info {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 1rem;
            font-size: 0.95rem;
          }
          .event-info-item {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .event-info-icon {
            flex-shrink: 0;
            width: 1.2rem;
            text-align: center;
          }
          .event-info-label {
            color: rgba(255, 255, 255, 0.6);
            font-weight: 500;
          }
          .event-info-value {
            color: #fff;
          }
          .description-box {
            background: rgba(255, 255, 255, 0.02);
            border-left: 3px solid #c8a8ff;
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 4px;
            font-size: 0.95rem;
            line-height: 1.6;
          }
          .content {
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.95rem;
          }
          .cta-section {
            text-align: center;
            margin: 2rem 0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, rgba(120, 80, 255, 0.8), rgba(80, 40, 200, 0.9));
            color: white;
            padding: 0.8rem 2rem;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            transition: opacity 0.2s;
            border: none;
            font-size: 0.95rem;
          }
          .button:hover {
            opacity: 0.9;
          }
          .footer {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255, 255, 255, 0.09);
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.4);
            text-align: center;
            line-height: 1.6;
          }
          .footer-links {
            margin-top: 1rem;
          }
          .footer-links a {
            color: rgba(200, 168, 255, 0.6);
            text-decoration: none;
            margin: 0 0.5rem;
          }
          .footer-links a:hover {
            text-decoration: underline;
          }
          @media (max-width: 600px) {
            .card {
              padding: 1.5rem;
            }
            .event-title {
              font-size: 1.1rem;
            }
            .button {
              display: block;
              width: 100%;
              padding: 1rem;
              text-align: center;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            
            <!-- HEADER -->
            <div class="header">
              <div class="logo">🎲</div>
              <h1>Inscription confirmée !</h1>
              <p class="subtitle">JDR Réunion</p>
            </div>

            <!-- CONTENU PRINCIPAL -->
            <div class="content">
              <div class="greeting">
                Bonjour <strong>${nom}</strong>,
              </div>

              <p>Votre inscription à l'événement suivant a bien été enregistrée :</p>

              <!-- DÉTAILS DE L'ÉVÉNEMENT -->
              <div class="event-details">
                <div class="event-title">${eventTitle}</div>
                
                <div class="event-info">
                  ${
                    date
                      ? `
                    <div class="event-info-item">
                      <div class="event-info-icon">📅</div>
                      <div>
                        <div class="event-info-label">Date</div>
                        <div class="event-info-value">${date}${time ? ` à ${time}` : ""}</div>
                      </div>
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    mj
                      ? `
                    <div class="event-info-item">
                      <div class="event-info-icon">🧙</div>
                      <div>
                        <div class="event-info-label">Meneur de Jeu</div>
                        <div class="event-info-value">${mj}</div>
                      </div>
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    system
                      ? `
                    <div class="event-info-item">
                      <div class="event-info-icon">⚔️</div>
                      <div>
                        <div class="event-info-label">Système</div>
                        <div class="event-info-value">${system}</div>
                      </div>
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>

              <!-- DESCRIPTION (si fournie) -->
              ${
                description
                  ? `
                <div class="description-box">
                  <strong>À propos de cette partie :</strong><br>
                  ${description}
                </div>
              `
                  : ""
              }

              <p>À bientôt sur place ! Préparez votre personnage et soyez prêt pour l'aventure.</p>

              <!-- BOUTON CTA -->
              <div class="cta-section">
                <p style="margin-bottom: 1rem; color: rgba(255,255,255,0.6); font-size: 0.9rem;">
                  Vous avez des questions ? N'hésitez pas à nous contacter.
                </p>
              </div>
            </div>

            <!-- FOOTER -->
            <div class="footer">
              <p style="margin: 0;">© 2024 JDR Réunion. Tous droits réservés.</p>
              <p style="margin: 0.5rem 0 0;">Vous recevez cet email parce que vous vous êtes inscrit à un événement sur notre plateforme.</p>
              <div class="footer-links">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://jdr-reunion.com"}">Retourner à la plateforme</a>
                <span style="color: rgba(255,255,255,0.2);">•</span>
                <a href="mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@jdr-reunion.com"}">Support</a>
              </div>
            </div>

          </div>
        </div>
      </body>
    </html>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION POUR ENVOYER L'EMAIL
// ═══════════════════════════════════════════════════════════════════════════════

async function sendEventEmail(data: RegisterEventRequest): Promise<string> {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || "noreply@jdr-reunion.re",
      to: data.email,
      subject: `🎲 Inscription confirmée — ${data.eventTitle}`,
      html: getEventEmailTemplate(data),
      // Texte simple en fallback (pour les clients email sans HTML)
      text: `
Bonjour ${data.nom},

Votre inscription à l'événement suivant a bien été enregistrée :

${data.eventTitle}
${data.date ? `📅 ${data.date}${data.time ? ` à ${data.time}` : ""}` : ""}
${data.mj ? `🧙 Meneur de Jeu: ${data.mj}` : ""}
${data.system ? `⚔️ Système: ${data.system}` : ""}

À bientôt sur place !

JDR Réunion
${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@jdr-reunion.com"}
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[EmailService] Email d'inscription envoyé:", info.messageId);
    return info.messageId;
  } catch (error: any) {
    console.error("[EmailService] Erreur lors de l'envoi:", error);
    throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTE - POST (créer/envoyer l'inscription)
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    // Valider la méthode
    if (req.method !== "POST") {
      return NextResponse.json(
        { error: "Méthode non autorisée" },
        { status: 405 }
      );
    }

    // Parser le corps de la requête
    let body: RegisterEventRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Erreur lors du parsing du JSON" },
        { status: 400 }
      );
    }

    // ─── VALIDATION DES CHAMPS OBLIGATOIRES ───────────────────────────────

    if (!body.nom || typeof body.nom !== "string" || !body.nom.trim()) {
      return NextResponse.json(
        { error: "Le nom est obligatoire" },
        { status: 400 }
      );
    }

    if (!body.email || typeof body.email !== "string") {
      return NextResponse.json(
        { error: "L'email est obligatoire" },
        { status: 400 }
      );
    }

    if (!body.eventTitle || typeof body.eventTitle !== "string") {
      return NextResponse.json(
        { error: "Le titre de l'événement est obligatoire" },
        { status: 400 }
      );
    }

    // ─── VALIDATION DU FORMAT EMAIL ─────────────────────────────────────

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.toLowerCase())) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    // ─── NETTOYAGE DES DONNÉES ─────────────────────────────────────────

    const cleanedData: RegisterEventRequest = {
      nom: body.nom.trim(),
      email: body.email.toLowerCase().trim(),
      eventTitle: body.eventTitle.trim(),
      date: body.date ? body.date.trim() : undefined,
      time: body.time ? body.time.trim() : undefined,
      mj: body.mj ? body.mj.trim() : undefined,
      system: body.system ? body.system.trim() : undefined,
      description: body.description ? body.description.trim() : undefined,
    };

    // ─── ENVOYER L'EMAIL ────────────────────────────────────────────────

    const messageId = await sendEventEmail(cleanedData);

    // ─── RETOUR SUCCÈS ─────────────────────────────────────────────────

    return NextResponse.json(
      {
        success: true,
        message: "Email d'inscription envoyé avec succès",
        messageId: messageId,
        data: {
          nom: cleanedData.nom,
          email: cleanedData.email,
          eventTitle: cleanedData.eventTitle,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API] Erreur dans /api/register-event:", error);

    // Retourner une erreur lisible sans exposer les détails sensibles
    return NextResponse.json(
      {
        success: false,
        error: "Une erreur est survenue lors de l'envoi de l'email",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTE - GET (pour tester en développement)
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  // Désactiver la route GET en production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Cette route de test n'est pas disponible en production" },
      { status: 403 }
    );
  }

  try {
    // Envoyer un email de test
    const testData: RegisterEventRequest = {
      nom: "Test User",
      email: process.env.EMAIL_USER || "test@example.com",
      eventTitle: "Test Event - La Forêt Maudite",
      date: "25 juin 2024",
      time: "19:00",
      mj: "Seigneur Valdris",
      system: "D&D 5e",
      description: "Une aventure de test pour vérifier que les emails fonctionnent correctement.",
    };

    const messageId = await sendEventEmail(testData);

    return NextResponse.json(
      {
        success: true,
        message: "Email de test envoyé avec succès",
        messageId: messageId,
        note: "Cet email a été envoyé à votre EMAIL_USER configuré",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API] Erreur lors du test:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur lors de l'envoi du test",
      },
      { status: 500 }
    );
  }
}

