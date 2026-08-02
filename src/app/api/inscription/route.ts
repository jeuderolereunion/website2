import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      email,
      pseudo,
      prenom,
      nom,
      eventTitle,
      date,
      heure,
      table,
      mj,
    } = body;

    const nomComplet = [nom, prenom].filter(Boolean).join(" ") || pseudo;

    await resend.emails.send({
      from: "JDR Réunion <noreply@jdr-reunion.com>",
      to: email,
      subject: `Inscription confirmée - ${eventTitle} - ${heure}`,
      html: `
      <div style="background-color:#f4f1ea;padding:32px 16px;font-family:Georgia, 'Times New Roman', serif;">
        <div style="max-width:520px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2ddd0;">

          <div style="background-color:#2b2118;padding:24px 32px;text-align:center;">
            <span style="color:#e8c77a;font-size:22px;font-weight:bold;letter-spacing:0.5px;">
              Inscription confirmée !
            </span>
          </div>

          <div style="padding:32px;">
            <p style="font-size:16px;color:#2b2118;margin:0 0 20px;">
              Bonjour <strong>${nomComplet}</strong>,
            </p>

            <p style="font-size:15px;color:#4a4038;line-height:1.6;margin:0 0 24px;">
              Votre inscription à l'événement suivant a bien été enregistrée :
            </p>

            <div style="background-color:#f9f6ef;border-left:4px solid #b8863b;padding:18px 20px;margin-bottom:24px;border-radius:4px;">
              <p style="font-size:18px;color:#2b2118;font-weight:bold;margin:0 0 8px;">
                ${eventTitle}
              </p>
              <p style="font-size:15px;color:#4a4038;margin:0 0 4px;">
                📅 ${date} à ${heure}
              </p>
              ${
                table
                  ? `<p style="font-size:15px;color:#4a4038;margin:0 0 4px;">🎲 Table : ${table}</p>`
                  : ""
              }
              ${
                mj
                  ? `<p style="font-size:15px;color:#4a4038;margin:0;">🧙 Maître de jeu : ${mj}</p>`
                  : ""
              }
            </div>

            <p style="font-size:15px;color:#4a4038;line-height:1.6;margin:0 0 8px;">
              À bientôt sur place !
            </p>
          </div>

          <div style="background-color:#f4f1ea;padding:16px 32px;text-align:center;border-top:1px solid #e2ddd0;">
            <p style="font-size:13px;color:#8a7f6f;margin:0;">
              JDR Réunion — <a href="https://jdr-reunion.com" style="color:#b8863b;text-decoration:none;">jdr-reunion.re</a>
            </p>
          </div>

        </div>
      </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}