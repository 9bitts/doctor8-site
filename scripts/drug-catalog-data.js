// scripts/drug-catalog-data.js
// Initial curated drug catalog: common medications (BR + international).
// This is a STARTING base — easy to grow later (ANVISA/FDA public lists can be imported).
// Fields: name, activeIngredient, presentation, manufacturer, country, category, controlled, prescriptionType
// prescriptionType: "OTC" (no rx), "RED_STRIPE" (tarja vermelha), "BLACK_STRIPE" (tarja preta/controlled), "RX"

module.exports = [
  // ── Antibióticos (BR) ──
  { name: "Amoxil", activeIngredient: "Amoxicilina", presentation: "500mg cápsula, caixa com 21", manufacturer: "GSK", country: "BR", category: "Antibiótico", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Amoxil", activeIngredient: "Amoxicilina", presentation: "250mg/5mL suspensão, frasco 150mL", manufacturer: "GSK", country: "BR", category: "Antibiótico", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Clavulin", activeIngredient: "Amoxicilina + Clavulanato de potássio", presentation: "875mg + 125mg comprimido, caixa com 14", manufacturer: "GSK", country: "BR", category: "Antibiótico", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Azitromicina", activeIngredient: "Azitromicina", presentation: "500mg comprimido, caixa com 3", manufacturer: "EMS", country: "BR", category: "Antibiótico", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Cefalexina", activeIngredient: "Cefalexina", presentation: "500mg cápsula, caixa com 8", manufacturer: "Medley", country: "BR", category: "Antibiótico", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Ciprofloxacino", activeIngredient: "Ciprofloxacino", presentation: "500mg comprimido, caixa com 14", manufacturer: "EMS", country: "BR", category: "Antibiótico", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Bactrim", activeIngredient: "Sulfametoxazol + Trimetoprima", presentation: "800mg + 160mg comprimido, caixa com 20", manufacturer: "Roche", country: "BR", category: "Antibiótico", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Metronidazol", activeIngredient: "Metronidazol", presentation: "400mg comprimido, caixa com 20", manufacturer: "Prati-Donaduzzi", country: "BR", category: "Antibiótico", controlled: false, prescriptionType: "RED_STRIPE" },

  // ── Analgésicos / Antitérmicos / AINEs (BR) ──
  { name: "Tylenol", activeIngredient: "Paracetamol", presentation: "750mg comprimido, caixa com 20", manufacturer: "Johnson & Johnson", country: "BR", category: "Analgésico/Antitérmico", controlled: false, prescriptionType: "OTC" },
  { name: "Dipirona", activeIngredient: "Dipirona sódica", presentation: "500mg comprimido, caixa com 10", manufacturer: "EMS", country: "BR", category: "Analgésico/Antitérmico", controlled: false, prescriptionType: "OTC" },
  { name: "Novalgina", activeIngredient: "Dipirona sódica", presentation: "1g comprimido, caixa com 10", manufacturer: "Sanofi", country: "BR", category: "Analgésico/Antitérmico", controlled: false, prescriptionType: "OTC" },
  { name: "Advil", activeIngredient: "Ibuprofeno", presentation: "400mg comprimido, caixa com 8", manufacturer: "Pfizer", country: "BR", category: "Anti-inflamatório", controlled: false, prescriptionType: "OTC" },
  { name: "Nimesulida", activeIngredient: "Nimesulida", presentation: "100mg comprimido, caixa com 12", manufacturer: "Medley", country: "BR", category: "Anti-inflamatório", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Voltaren", activeIngredient: "Diclofenaco sódico", presentation: "50mg comprimido, caixa com 20", manufacturer: "Novartis", country: "BR", category: "Anti-inflamatório", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Aspirina", activeIngredient: "Ácido acetilsalicílico", presentation: "500mg comprimido, caixa com 20", manufacturer: "Bayer", country: "BR", category: "Analgésico", controlled: false, prescriptionType: "OTC" },
  { name: "Toragesic", activeIngredient: "Cetorolaco de trometamina", presentation: "10mg comprimido sublingual, caixa com 10", manufacturer: "EMS", country: "BR", category: "Analgésico", controlled: false, prescriptionType: "RED_STRIPE" },

  // ── Anti-hipertensivos / Cardiovascular (BR) ──
  { name: "Losartana", activeIngredient: "Losartana potássica", presentation: "50mg comprimido, caixa com 30", manufacturer: "EMS", country: "BR", category: "Anti-hipertensivo", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Enalapril", activeIngredient: "Maleato de enalapril", presentation: "20mg comprimido, caixa com 30", manufacturer: "Medley", country: "BR", category: "Anti-hipertensivo", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Atenolol", activeIngredient: "Atenolol", presentation: "50mg comprimido, caixa com 30", manufacturer: "EMS", country: "BR", category: "Anti-hipertensivo", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Anlodipino", activeIngredient: "Besilato de anlodipino", presentation: "5mg comprimido, caixa com 30", manufacturer: "Prati-Donaduzzi", country: "BR", category: "Anti-hipertensivo", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Hidroclorotiazida", activeIngredient: "Hidroclorotiazida", presentation: "25mg comprimido, caixa com 30", manufacturer: "Medley", country: "BR", category: "Diurético", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Sinvastatina", activeIngredient: "Sinvastatina", presentation: "20mg comprimido, caixa com 30", manufacturer: "EMS", country: "BR", category: "Hipolipemiante", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Atorvastatina", activeIngredient: "Atorvastatina cálcica", presentation: "20mg comprimido, caixa com 30", manufacturer: "Medley", country: "BR", category: "Hipolipemiante", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "AAS", activeIngredient: "Ácido acetilsalicílico", presentation: "100mg comprimido, caixa com 30", manufacturer: "Sanofi", country: "BR", category: "Antiagregante plaquetário", controlled: false, prescriptionType: "OTC" },

  // ── Diabetes (BR) ──
  { name: "Metformina", activeIngredient: "Cloridrato de metformina", presentation: "850mg comprimido, caixa com 30", manufacturer: "Merck", country: "BR", category: "Antidiabético", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Glifage XR", activeIngredient: "Cloridrato de metformina", presentation: "500mg comprimido liberação prolongada, caixa com 30", manufacturer: "Merck", country: "BR", category: "Antidiabético", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Glibenclamida", activeIngredient: "Glibenclamida", presentation: "5mg comprimido, caixa com 30", manufacturer: "Medley", country: "BR", category: "Antidiabético", controlled: false, prescriptionType: "RED_STRIPE" },

  // ── Gastro (BR) ──
  { name: "Omeprazol", activeIngredient: "Omeprazol", presentation: "20mg cápsula, caixa com 28", manufacturer: "EMS", country: "BR", category: "Inibidor de bomba de prótons", controlled: false, prescriptionType: "OTC" },
  { name: "Pantoprazol", activeIngredient: "Pantoprazol sódico", presentation: "40mg comprimido, caixa com 28", manufacturer: "Medley", country: "BR", category: "Inibidor de bomba de prótons", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Ranitidina", activeIngredient: "Cloridrato de ranitidina", presentation: "150mg comprimido, caixa com 20", manufacturer: "EMS", country: "BR", category: "Antiácido", controlled: false, prescriptionType: "OTC" },
  { name: "Buscopan", activeIngredient: "Butilbrometo de escopolamina", presentation: "10mg comprimido, caixa com 20", manufacturer: "Boehringer Ingelheim", country: "BR", category: "Antiespasmódico", controlled: false, prescriptionType: "OTC" },
  { name: "Plasil", activeIngredient: "Metoclopramida", presentation: "10mg comprimido, caixa com 20", manufacturer: "Sanofi", country: "BR", category: "Antiemético", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Vonau", activeIngredient: "Ondansetrona", presentation: "8mg comprimido orodispersível, caixa com 10", manufacturer: "Biolab", country: "BR", category: "Antiemético", controlled: false, prescriptionType: "RED_STRIPE" },

  // ── Respiratório / Alergia (BR) ──
  { name: "Loratadina", activeIngredient: "Loratadina", presentation: "10mg comprimido, caixa com 12", manufacturer: "EMS", country: "BR", category: "Anti-histamínico", controlled: false, prescriptionType: "OTC" },
  { name: "Allegra", activeIngredient: "Cloridrato de fexofenadina", presentation: "180mg comprimido, caixa com 10", manufacturer: "Sanofi", country: "BR", category: "Anti-histamínico", controlled: false, prescriptionType: "OTC" },
  { name: "Desalex", activeIngredient: "Desloratadina", presentation: "5mg comprimido, caixa com 10", manufacturer: "Mantecorp", country: "BR", category: "Anti-histamínico", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Predsim", activeIngredient: "Prednisolona", presentation: "20mg comprimido, caixa com 10", manufacturer: "Mantecorp", country: "BR", category: "Corticoide", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Aerolin", activeIngredient: "Sulfato de salbutamol", presentation: "100mcg/dose aerossol, frasco", manufacturer: "GSK", country: "BR", category: "Broncodilatador", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Berotec", activeIngredient: "Bromidrato de fenoterol", presentation: "5mg/mL solução gotas, frasco 20mL", manufacturer: "Boehringer Ingelheim", country: "BR", category: "Broncodilatador", controlled: false, prescriptionType: "RED_STRIPE" },

  // ── Saúde mental (BR) — controlados ──
  { name: "Rivotril", activeIngredient: "Clonazepam", presentation: "2mg comprimido, caixa com 30", manufacturer: "Roche", country: "BR", category: "Ansiolítico", controlled: true, prescriptionType: "BLACK_STRIPE" },
  { name: "Fluoxetina", activeIngredient: "Cloridrato de fluoxetina", presentation: "20mg cápsula, caixa com 30", manufacturer: "EMS", country: "BR", category: "Antidepressivo", controlled: true, prescriptionType: "BLACK_STRIPE" },
  { name: "Sertralina", activeIngredient: "Cloridrato de sertralina", presentation: "50mg comprimido, caixa com 30", manufacturer: "Medley", country: "BR", category: "Antidepressivo", controlled: true, prescriptionType: "BLACK_STRIPE" },
  { name: "Escitalopram", activeIngredient: "Oxalato de escitalopram", presentation: "10mg comprimido, caixa com 30", manufacturer: "Lundbeck", country: "BR", category: "Antidepressivo", controlled: true, prescriptionType: "BLACK_STRIPE" },
  { name: "Amitriptilina", activeIngredient: "Cloridrato de amitriptilina", presentation: "25mg comprimido, caixa com 20", manufacturer: "EMS", country: "BR", category: "Antidepressivo", controlled: true, prescriptionType: "BLACK_STRIPE" },

  // ── Outros comuns (BR) ──
  { name: "Puran T4", activeIngredient: "Levotiroxina sódica", presentation: "50mcg comprimido, caixa com 30", manufacturer: "Sanofi", country: "BR", category: "Hormônio tireoidiano", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Anticoncepcional", activeIngredient: "Etinilestradiol + Levonorgestrel", presentation: "0,03mg + 0,15mg comprimido, cartela com 21", manufacturer: "Bayer", country: "BR", category: "Contraceptivo", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Cataflam", activeIngredient: "Diclofenaco potássico", presentation: "50mg comprimido, caixa com 20", manufacturer: "Novartis", country: "BR", category: "Anti-inflamatório", controlled: false, prescriptionType: "RED_STRIPE" },
  { name: "Dorflex", activeIngredient: "Dipirona + Orfenadrina + Cafeína", presentation: "comprimido, caixa com 36", manufacturer: "Sanofi", country: "BR", category: "Relaxante muscular/Analgésico", controlled: false, prescriptionType: "OTC" },

  // ── International (US) ──
  { name: "Amoxil", activeIngredient: "Amoxicillin", presentation: "500mg capsule, bottle of 30", manufacturer: "GSK", country: "US", category: "Antibiotic", controlled: false, prescriptionType: "RX" },
  { name: "Augmentin", activeIngredient: "Amoxicillin + Clavulanate", presentation: "875mg + 125mg tablet, bottle of 20", manufacturer: "GSK", country: "US", category: "Antibiotic", controlled: false, prescriptionType: "RX" },
  { name: "Zithromax", activeIngredient: "Azithromycin", presentation: "500mg tablet, Z-Pak of 3", manufacturer: "Pfizer", country: "US", category: "Antibiotic", controlled: false, prescriptionType: "RX" },
  { name: "Tylenol", activeIngredient: "Acetaminophen", presentation: "500mg tablet, bottle of 100", manufacturer: "Johnson & Johnson", country: "US", category: "Analgesic/Antipyretic", controlled: false, prescriptionType: "OTC" },
  { name: "Advil", activeIngredient: "Ibuprofen", presentation: "200mg tablet, bottle of 50", manufacturer: "Pfizer", country: "US", category: "NSAID", controlled: false, prescriptionType: "OTC" },
  { name: "Lipitor", activeIngredient: "Atorvastatin", presentation: "20mg tablet, bottle of 30", manufacturer: "Pfizer", country: "US", category: "Statin", controlled: false, prescriptionType: "RX" },
  { name: "Glucophage", activeIngredient: "Metformin", presentation: "850mg tablet, bottle of 60", manufacturer: "Merck", country: "US", category: "Antidiabetic", controlled: false, prescriptionType: "RX" },
  { name: "Cozaar", activeIngredient: "Losartan", presentation: "50mg tablet, bottle of 30", manufacturer: "Merck", country: "US", category: "Antihypertensive", controlled: false, prescriptionType: "RX" },
  { name: "Prilosec", activeIngredient: "Omeprazole", presentation: "20mg capsule, bottle of 28", manufacturer: "AstraZeneca", country: "US", category: "Proton pump inhibitor", controlled: false, prescriptionType: "OTC" },
  { name: "Zoloft", activeIngredient: "Sertraline", presentation: "50mg tablet, bottle of 30", manufacturer: "Pfizer", country: "US", category: "Antidepressant", controlled: false, prescriptionType: "RX" },
  { name: "Prozac", activeIngredient: "Fluoxetine", presentation: "20mg capsule, bottle of 30", manufacturer: "Eli Lilly", country: "US", category: "Antidepressant", controlled: false, prescriptionType: "RX" },
  { name: "Synthroid", activeIngredient: "Levothyroxine", presentation: "50mcg tablet, bottle of 90", manufacturer: "AbbVie", country: "US", category: "Thyroid hormone", controlled: false, prescriptionType: "RX" },
  { name: "Ventolin", activeIngredient: "Albuterol", presentation: "90mcg/dose inhaler", manufacturer: "GSK", country: "US", category: "Bronchodilator", controlled: false, prescriptionType: "RX" },
  { name: "Claritin", activeIngredient: "Loratadine", presentation: "10mg tablet, bottle of 30", manufacturer: "Bayer", country: "US", category: "Antihistamine", controlled: false, prescriptionType: "OTC" },
];
