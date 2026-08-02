import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      email,
      pseudo,
      eventTitle,
      date,
      heure,
      table,
      statut,
    } = body;

    await resend.emails.send({
      from: "JDR Réunion <noreply@jdr-reunion.com>",
      to: email,
      subject:
        statut === "confirme"
          ? `Confirmation d'inscription - ${eventTitle}`
          : `Liste d'attente - ${eventTitle}`,
      html: `
        <h2>${statut === "confirme"
          ? "Votre inscription est confirmée !"
          : "Vous êtes en liste d'attente"}</h2>

        <p>Bonjour <strong>${pseudo}</strong>,</p>

        <p>Merci pour votre inscription.</p>

        <table cellpadding="6">
          <tr>
            <td><strong>Animation :</strong></td>
            <td>${eventTitle}</td>
          </tr>
          <tr>
            <td><strong>Date :</strong></td>
            <td>${date}</td>
          </tr>
          <tr>
            <td><strong>Heure :</strong></td>
            <td>${heure}</td>
          </tr>
          ${
            table
              ? `
          <tr>
            <td><strong>Table :</strong></td>
            <td>${table}</td>
          </tr>`
              : ""
          }
        </table>

        ${
          statut === "confirme"
            ? "<p>Nous avons hâte de vous accueillir !</p>"
            : "<p>Nous vous contacterons si une place se libère.</p>"
        }

        <hr>

        <p>Association JDR Réunion</p>
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