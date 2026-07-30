import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

type Destinataire = { email: string; nom?: string };

export async function POST(req: NextRequest) {
  try {
    const { destinataires, eventTitle, date, heure, lieu } = await req.json();

    if (!Array.isArray(destinataires) || destinataires.length === 0 || !eventTitle || !date || !heure) {
      return NextResponse.json(
        { error: "Champs manquants dans la requête." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    function buildMail(dest: Destinataire) {
      const nomAffiche = dest.nom || "Aventurier";

      const textVersion = `Événement annulé

Bonjour ${nomAffiche},

Nous sommes désolés de vous informer que l'événement suivant a été annulé :

${eventTitle}
${date} à ${heure}${lieu ? `\n${lieu}` : ""}

Vous n'avez rien à faire de votre côté, votre inscription est automatiquement annulée.
N'hésitez pas à consulter le site pour découvrir d'autres événements.

JDR Réunion — jdr-reunion.re`;

      const htmlVersion = `
        <div style="background:#0d0d14; padding: 32px 16px; font-family: Arial, Helvetica, sans-serif;">
          <div style="max-width: 480px; margin: 0 auto; background:#13131e; border:1px solid rgba(255,80,80,0.25); border-radius:14px; padding: 32px;">

            <p style="font-size: 20px; font-weight: bold; color:#fff; margin: 0 0 24px;">
              🚫 <span style="color:#ff8080;">Événement annulé</span>
            </p>

            <p style="color:#fff; font-size: 15px; margin: 0 0 16px;">
              Bonjour <strong>${nomAffiche}</strong>,
            </p>

            <p style="color:rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 20px;">
              Nous sommes désolés de vous informer que l'événement suivant a été annulé :
            </p>

            <div style="background:rgba(255,80,80,0.1); border:1px solid rgba(255,80,80,0.25); border-radius:10px; padding: 18px 20px; margin-bottom: 24px;">
              <p style="color:#fff; font-size: 16px; font-weight:bold; margin: 0 0 8px;">
                ${eventTitle}
              </p>
              <p style="color:rgba(255,255,255,0.6); font-size: 13px; margin: 0 0 4px;">
                📅 ${date} à ${heure}
              </p>
              ${lieu ? `<p style="color:rgba(255,255,255,0.6); font-size: 13px; margin: 0;">📍 ${lieu}</p>` : ""}
            </div>

            <p style="color:rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 8px;">
              Votre inscription est automatiquement annulée, vous n'avez rien à faire de votre côté.
            </p>
            <p style="color:rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 28px;">
              N'hésitez pas à consulter le site pour découvrir d'autres événements.
            </p>

            <p style="color:rgba(255,255,255,0.4); font-size: 12px; margin: 0; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
              JDR Réunion — <a href="https://jdr-reunion.com" style="color:#8e7cff; text-decoration:none;">jdr-reunion.re</a>
            </p>

          </div>
        </div>
      `;

      return {
        from: `"JDR Réunion" <${process.env.SMTP_USER}>`,
        to: dest.email,
        replyTo: process.env.SMTP_USER,
        subject: `Annulation - ${eventTitle}`,
        text: textVersion,
        html: htmlVersion,
        headers: {
          "X-Entity-Ref-ID": `annulation-${eventTitle}-${Date.now()}`,
        },
      };
    }

    // Envoi en parallèle, mais on isole les échecs individuels pour ne pas
    // faire échouer tout le lot si un seul email est invalide.
    const results = await Promise.allSettled(
      (destinataires as Destinataire[]).map((dest) =>
        transporter.sendMail(buildMail(dest))
      )
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error(`❌ ${failed.length} email(s) d'annulation ont échoué`, failed);
    }

    return NextResponse.json({
      success: true,
      sent: results.length - failed.length,
      failed: failed.length,
    });

  } catch (error: any) {
    console.error("❌ Erreur envoi emails d'annulation :", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'envoi des emails." },
      { status: 500 }
    );
  }
}