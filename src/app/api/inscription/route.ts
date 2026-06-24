import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { nom, email, eventTitle, date, time } = await req.json();

    if (!nom || !email || !eventTitle) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    await transporter.sendMail({
      from:    `"JDR Réunion" <${process.env.SMTP_USER}>`,
      to:      email,
      subject: `Confirmation d'inscription — ${eventTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 2rem; background: #0d0d14; color: #fff; border-radius: 12px;">
          <h2 style="color: #c8a8ff;">🎲 Inscription confirmée !</h2>
          <p>Bonjour <strong>${nom}</strong>,</p>
          <p>Votre inscription à l'événement suivant a bien été enregistrée :</p>
          <div style="background: rgba(120,80,255,0.15); border: 1px solid rgba(160,120,255,0.3); border-radius: 8px; padding: 1rem; margin: 1.5rem 0;">
            <p style="margin: 0; font-size: 1.1rem; font-weight: bold;">${eventTitle}</p>
            <p style="margin: 0.5rem 0 0; color: rgba(255,255,255,0.6);">📅 ${date} à ${time}</p>
          </div>
          <p>À bientôt sur place !</p>
          <p style="color: rgba(255,255,255,0.4); font-size: 0.8rem; margin-top: 2rem;">
            JDR Réunion — jdr-reunion.re
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error("Erreur email inscription :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}