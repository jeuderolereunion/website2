import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nom, email, message /* + vos champs */ } = body

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // true pour 465, false pour 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_TO, // votre adresse de réception
      subject: `Nouvelle inscription : ${nom}`,
      text: `Nom: ${nom}\nEmail: ${email}\nMessage: ${message}`,
      html: `<p><strong>Nom:</strong> ${nom}</p><p><strong>Email:</strong> ${email}</p><p>${message}</p>`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur envoi email:', error)
    return NextResponse.json(
      { success: false, error: 'Échec de l\'envoi' },
      { status: 500 }
    )
  }
}