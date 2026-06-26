import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { nom, email, eventTitle, date, time } = await req.json();

    if (!nom || !email || !eventTitle || !date || !time) {
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

    // Version texte brut — obligatoire pour la délivrabilité,
    // les filtres anti-spam pénalisent les emails HTML-only.
    const textVersion = `Bonjour ${nom},

Votre inscription à l'événement suivant est confirmée :

Événement : ${eventTitle}
Date : ${date}
Heure : ${time}

À très bientôt !
Donjons & Plateau`;

    const mailOptions = {
      from: `"Donjons & Plateau" <${process.env.SMTP_USER}>`,
      to: email,
      replyTo: process.env.SMTP_USER,
      subject: `Confirmation d'inscription - ${eventTitle}`,
      text: textVersion,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; color: #222;">
          <h2 style="color:#7c4dff;">Inscription confirmée</h2>
          <p>Bonjour ${nom},</p>
          <p>Votre inscription à l'événement suivant est confirmée :</p>
          <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 6px 0; color:#555;">Événement</td>
              <td style="padding: 6px 0; font-weight:bold;">${eventTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color:#555;">Date</td>
              <td style="padding: 6px 0; font-weight:bold;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color:#555;">Heure</td>
              <td style="padding: 6px 0; font-weight:bold;">${time}</td>
            </tr>
          </table>
          <p>À très bientôt !</p>
          <p style="color:#888; font-size: 0.8rem; margin-top: 24px;">
            Donjons &amp; Plateau — Réunion
          </p>
        </div>
      `,
      headers: {
        "X-Entity-Ref-ID": `${eventTitle}-${Date.now()}`, // évite que Gmail regroupe/déduplique des emails similaires comme suspects
      },
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ Erreur envoi email :", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'envoi de l'email." },
      { status: 500 }
    );
  }
}