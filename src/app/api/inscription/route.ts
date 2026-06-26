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

    // Transporteur SMTP — adapte les variables d'env à ton fournisseur
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,         // ex: "smtp.gmail.com" ou "ssl0.ovh.net"
      port: Number(process.env.SMTP_PORT), // ex: 465
     secure: Number(process.env.SMTP_PORT) === 465, // true pour 465, false pour 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Donjons & Plateau" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Confirmation d'inscription — ${eventTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
          <h2 style="color:#7c4dff;">Inscription confirmée 🎉</h2>
          <p>Bonjour ${nom},</p>
          <p>Votre inscription à l'événement suivant est confirmée :</p>
          <ul>
            <li><strong>Événement :</strong> ${eventTitle}</li>
            <li><strong>Date :</strong> ${date}</li>
            <li><strong>Heure :</strong> ${time}</li>
          </ul>
          <p>À très bientôt !</p>
        </div>
      `,
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