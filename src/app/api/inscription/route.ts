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

    const textVersion = `Inscription confirmée !

Bonjour ${nom},

Votre inscription à l'événement suivant a bien été enregistrée :

${eventTitle}
${date} à ${time}

À bientôt sur place !

JDR Réunion — jdr-reunion.com`;

    const htmlVersion = `
      <div style="background:#0d0d14; padding: 32px 16px; font-family: Arial, Helvetica, sans-serif;">
        <div style="max-width: 480px; margin: 0 auto; background:#13131e; border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding: 32px;">

          <p style="font-size: 20px; font-weight: bold; color:#fff; margin: 0 0 24px;">
            🎲 <span style="color:#c8a8ff;">Inscription confirmée !</span>
          </p>

          <p style="color:#fff; font-size: 15px; margin: 0 0 16px;">
            Bonjour <strong>${nom}</strong>,
          </p>

          <p style="color:rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 20px;">
            Votre inscription à l'événement suivant a bien été enregistrée :
          </p>

          <div style="background:rgba(120,80,255,0.12); border:1px solid rgba(160,120,255,0.25); border-radius:10px; padding: 18px 20px; margin-bottom: 24px;">
            <p style="color:#fff; font-size: 16px; font-weight:bold; margin: 0 0 8px;">
              ${eventTitle}
            </p>
            <p style="color:rgba(255,255,255,0.6); font-size: 13px; margin: 0;">
              📅 ${date} à ${time}
            </p>
          </div>

          <p style="color:rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 28px;">
            À bientôt sur place !
          </p>

          <p style="color:rgba(255,255,255,0.4); font-size: 12px; margin: 0; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
            JDR Réunion — <a href="https://jdr-reunion.com" style="color:#8e7cff; text-decoration:none;">jdr-reunion.re</a>
          </p>

        </div>
      </div>
    `;

    const mailOptions = {
      from: `"JDR Réunion" <${process.env.SMTP_USER}>`,
      to: email,
      replyTo: process.env.SMTP_USER,
      subject: `Confirmation d'inscription - ${eventTitle}`,
      text: textVersion,
      html: htmlVersion,
      headers: {
        "X-Entity-Ref-ID": `${eventTitle}-${Date.now()}`,
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