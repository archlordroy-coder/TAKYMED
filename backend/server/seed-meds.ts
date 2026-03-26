import { db } from "./db";

console.log("Seeding medications...");

const medications = [
  {
    name: "Doliprane 500mg",
    description: "Antalgique et antipyrétique (paracétamol). Indiqué en cas de douleur et/ou fièvre.",
    price: "1500 FCFA",
    type: "comprime",
    photoUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80"
  },
  {
    name: "Amoxicilline 500mg",
    description: "Antibiotique de la famille des pénicillines. Utilisé pour traiter diverses infections bactériennes.",
    price: "2500 FCFA",
    type: "gelule",
    photoUrl: "https://images.unsplash.com/photo-1471864190281-a93a30724677?w=400&q=80"
  },
  {
    name: "Spasfon",
    description: "Traitement des douleurs spasmodiques de l'intestin, des voies biliaires, de la vessie et de l'utérus.",
    price: "1800 FCFA",
    type: "comprime",
    photoUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80"
  },
  {
    name: "Efferalgan 1g",
    description: "Paracétamol fortement dosé pour les douleurs intenses et la fièvre chez l'adulte.",
    price: "1200 FCFA",
    type: "comprime",
    photoUrl: "https://images.unsplash.com/photo-1626716493137-b67fe9501e76?w=400&q=80"
  }
];

for (const med of medications) {
  try {
    db.prepare(`
      INSERT INTO Medicaments (nom, description, prix, type_utilisation, photo_url, date_ajout)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(nom) DO UPDATE SET
        description = excluded.description,
        prix = excluded.prix,
        type_utilisation = excluded.type_utilisation,
        photo_url = excluded.photo_url
    `).run(med.name, med.description, med.price, med.type, med.photoUrl);
    console.log(`✅ Seeded: ${med.name}`);
  } catch (err) {
    console.error(`❌ Failed to seed ${med.name}:`, err);
  }
}

console.log("Seeding complete.");
process.exit(0);
