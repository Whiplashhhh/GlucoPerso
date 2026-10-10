import { type Zippable, strToU8, zipSync } from "fflate";
import { dayKey } from "@/lib/dates";
import { attachment, exportOwner, unauthorized } from "@/server/export/respond";
import { readOwnedPhoto } from "@/server/photos";
import { collectAllData } from "@/server/repos/export";

const README = `GlucoPerso — export complet de tes données

data.json   : ton profil, tes réglages, tes ratios et leur historique, les suggestions,
              tes plats, tes repas, tes injections de lente.
photos/     : les photos de tes repas (WebP), nommées par identifiant.

Les glycémies sont en g/L, les dates en UTC (format ISO 8601).
Les secrets (mot de passe, sessions, codes de secours) ne sont jamais exportés.
`;

/** RGPD: everything she stored, as a ZIP. Served only to herself. */
export async function GET() {
  const owner = await exportOwner();
  if (!owner) return unauthorized();
  const userId = owner.user.id;

  const { data, photoIds } = await collectAllData(userId);
  const files: Zippable = {
    "LISEZMOI.txt": strToU8(README),
    "data.json": strToU8(JSON.stringify(data, null, 2)),
  };
  for (const id of photoIds) {
    const photo = await readOwnedPhoto(userId, id, "full");
    // WebP is already compressed: store as is.
    if (photo) files[`photos/${id}.webp`] = [new Uint8Array(photo), { level: 0 }];
  }

  const zip = zipSync(files, { level: 6 });
  const day = dayKey(new Date(), owner.settings.timezone);
  return attachment(new Uint8Array(zip), "application/zip", `glucoperso-mes-donnees-${day}.zip`);
}
