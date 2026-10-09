import "server-only";
import nodemailer from "nodemailer";
import { env, smtpEnabled } from "@/lib/env";

const transport = smtpEnabled
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    })
  : null;

export async function sendPasswordResetEmail(to: string, url: string): Promise<void> {
  if (!transport) return;
  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "Ton lien pour choisir un nouveau mot de passe",
    text: [
      "Coucou,",
      "",
      "Tu as demandé à réinitialiser ton mot de passe GlucoPerso.",
      `Voici ton lien (valable une heure) : ${url}`,
      "",
      "Si ce n'était pas toi, ignore simplement ce message.",
    ].join("\n"),
  });
}
