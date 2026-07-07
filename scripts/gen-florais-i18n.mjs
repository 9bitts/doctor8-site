import fs from "fs";

const bachNegPos = {
  rockRose: ["Terror", "Coragem"],
  mimulus: ["Medos concretos / timidez", "Segurança / empatia"],
  cherryPlum: ["Desespero / medo de perder o controle", "Serenidade / clareza"],
  aspen: ["Medos desconhecidos / apreensão", "Calma / tranquilidade"],
  redChestnut: ["Temor excessivo pelos outros", "Confiança na segurança dos outros"],
  cerato: ["Hesitação", "Confiança na intuição"],
  scleranthus: ["Indecisão", "Determinação"],
  gentian: ["Dúvida por falta de fé", "Perseverança"],
  gorse: ["Desesperança", "Otimismo"],
  hornbeam: ["Sentir-se sobrecarregado", "Força interior"],
  wildOat: ["Incerteza / desorientação", "Rumo claro / propósito de vida"],
  clematis: ["Indiferença / dispersão", "Foco / ancoramento"],
  honeysuckle: ["Nostalgia", "Viver o tempo presente"],
  wildRose: ["Apatia", "Entusiasmo e vitalidade"],
  olive: ["Exaustão total", "Vitalidade"],
  whiteChestnut: ["Pensamentos repetitivos", "Mente tranquila"],
  mustard: ["Súbita melancolia", "Estabilidade e alegria de viver"],
  chestnutBud: ["Fracasso em aprender pela experiência", "Autoconsciência"],
  waterViolet: ["Alienação / orgulho", "Envolvimento / servir ao próximo"],
  impatiens: ["Impaciência", "Ritmo"],
  heather: ["Egocentrismo", "Atencioso / cooperativo"],
  agrimony: ["Felicidade aparente", "Paz interior"],
  centaury: ["Vontade enfraquecida", "Força e poder interior"],
  walnut: ["Limitação por influências externas", "Liberdade para mudar"],
  holly: ["Ciúme / raiva / ódio", "Amor e bondade"],
  larch: ["Sentimento de inferioridade", "Autoconfiança"],
  pine: ["Culpa e autocensura", "Aceitação das responsabilidades"],
  elm: ["Desalento", "Aceitação de responsabilidade"],
  sweetChestnut: ["Angústia mental e desolação", "Fé em encontrar consolo"],
  starOfBethlehem: ["Choque extremo", "Paz / consolo"],
  willow: ["Ressentimento e amargura", "Perdão e autorresponsabilidade"],
  oak: ["Uso excessivo das forças", "Consciência dos limites"],
  wildApple: ["Aversão a si próprio", "Autoestima equilibrada"],
  chicory: ["Possessividade / autopiedade", "Amor incondicional"],
  vervain: ["Entusiasmo exacerbado", "Respeito à opinião alheia"],
  vine: ["Autoritarismo", "Liderança positiva"],
  beech: ["Intolerância / crítica", "Perfeita tolerância"],
  rockWater: ["Negação de si / padrões rígidos", "Autorrealização / flexibilidade"],
};

const bachLabels = {
  rockRose: "Rock Rose (Heliantemo)",
  mimulus: "Mimulus (Mímulo)",
  cherryPlum: "Cherry Plum (Cerejeira)",
  aspen: "Aspen (Álamo)",
  redChestnut: "Red Chestnut (Castanheiro-vermelho)",
  cerato: "Cerato",
  scleranthus: "Scleranthus",
  gentian: "Gentian (Gentiana)",
  gorse: "Gorse (Tojo)",
  hornbeam: "Hornbeam (Carpino)",
  wildOat: "Wild Oat (Aveia-brava)",
  clematis: "Clematis",
  honeysuckle: "Honeysuckle (Madressilva)",
  wildRose: "Wild Rose (Roseira-brava)",
  olive: "Olive (Oliva)",
  whiteChestnut: "White Chestnut (Castanheiro-branco)",
  mustard: "Mustard (Mostarda)",
  chestnutBud: "Chestnut Bud (Broto-de-castanheiro)",
  waterViolet: "Water Violet (Violeta-d'água)",
  impatiens: "Impatiens (Impaciência)",
  heather: "Heather (Urze)",
  agrimony: "Agrimony (Agrimony)",
  centaury: "Centaury (Centáuria)",
  walnut: "Walnut (Nogueira)",
  holly: "Holly (Azevinho)",
  larch: "Larch (Larício)",
  pine: "Pine (Pinheiro)",
  elm: "Elm (Olmo)",
  sweetChestnut: "Sweet Chestnut (Castanheiro)",
  starOfBethlehem: "Star of Bethlehem (Estrela-de-Belém)",
  willow: "Willow (Salgueiro)",
  oak: "Oak (Carvalho)",
  wildApple: "Crab Apple (Maçã-silvestre)",
  chicory: "Chicory (Chicória)",
  vervain: "Vervain (Verbena)",
  vine: "Vine (Videira)",
  beech: "Beech (Faia)",
  rockWater: "Rock Water (Água-de-rocha)",
};

const sgEssences = [
  ["abiesLourdes", "Abies de Lourdes", "Força e coragem diante de grandes fardos e sacrifícios."],
  ["abrico", "Abriçó", "Desconexão, solidão e dificuldade de concretizar; reconexão com a alma."],
  ["abundancia", "Abundância", "Conexão com a fonte divina de abundância; neutraliza escassez."],
  ["alcachofra", "Alcachofra SG", "Transformação da consciência; vergonha, medo e limpeza energética."],
  ["algodao", "Algodão", "Reconexão com o Eu Superior; limpeza da aura; dependências."],
  ["allium", "Allium", "Desobsessão; proteção psíquica; calma e discernimento."],
  ["aloe", "Aloe SG", "Baixa autoestima após traição; compreensão do propósito de vida."],
  ["ameixa", "Ameixa", "Perturbação mental por manipulação ou toxinas; equilíbrio da mente."],
  ["amygdalus", "Amygdalus", "Equilíbrio espiritual, mental e material; desejos e fantasias."],
  ["anis", "Anis", "Medo da entrega plena; tranquilizante; insônia e agitação nervosa."],
  ["arnicaSilvestre", "Arnica Silvestre", "Traumas físicos e morais; pré e pós-operatório."],
  ["aveiaSelvagem", "Aveia Selvagem", "Indecisão; contato com orientações do Eu Superior."],
  ["bambusa", "Bambusa", "Desvio do propósito; distração e vampirismo energético."],
  ["begonia", "Begônia", "Pureza da criança interior; oráculo interno."],
  ["boaDeusa", "Boa Deusa", "Abalos por calúnia, inveja e traição."],
  ["boaSorte", "Boa Sorte", "Prosperidade cósmica; proteção e remoção de obstáculos."],
  ["bomDia", "Bom Dia", "Dificuldade de acordar; disposição e alegria matinal."],
  ["canela", "Canela SG", "Visão ampla; pessoa presa nos detalhes e aflição."],
  ["capimLuz", "Capim Luz", "Conexão vontade-coração; traumas de asfixia."],
  ["capimSeda", "Capim Seda", "Bloqueio do fluxo energético; caminho da alma."],
  ["carrapichao", "Carrapichão", "Vampirismo por sondas astrais; expressão do verdadeiro Eu."],
  ["chapeuSol", "Chapéu de Sol", "Proteção contra inveja ao se destacar."],
  ["cidreira", "Cidreira", "Controle dos pensamentos; ansiedade, insônia e estresse."],
  ["cocos", "Cocos", "Personalidade passiva; força, fibra e discernimento."],
  ["coronarium", "Coronarium", "Agitação interna; chakra coronário; lucidez."],
  ["curculigum", "Curculigum", "Limites saudáveis; dizer não; terapeutas."],
  ["dulcis", "Dulcis", "Elevação vibratória; medos indefinidos no peito."],
  ["embauba", "Embaúba", "Mágoas, perdas e rejeição; estagnação emocional."],
  ["erbum", "Erbum", "Perda de cadência rítmica após grandes reveses."],
  ["erianthum", "Erianthum", "Egoísmo, mau humor e maus hábitos alimentares."],
  ["florBranca", "Flor Branca", "Limpeza de cargas mentais e emocionais inúteis."],
  ["focum", "Focum", "Traumas de mortes violentas; medo de dirigir."],
  ["geranio", "Gerânio SG", "Depressão, ansiedade e imaturidade; ancoramento no aqui-agora."],
  ["gloxinia", "Gloxínia", "Angústia por acúmulo de afazeres; organização de prioridades."],
  ["goiaba", "Goiaba", "Medos concretos; coragem em situações de perigo."],
  ["gracilis", "Gracilis", "Reorganização energética; missão espiritual."],
  ["grandiflora", "Grandiflora", "Sadismo e máscaras; purificação da essência."],
  ["grevilea", "Grevílea", "Raiva por invasão de limites; intolerância alheia."],
  ["heliconia", "Helicônia", "Narcisismo, vaidade e exibicionismo."],
  ["incensum", "Incensum", "Limpeza da aura e ambientes; elevação vibratória."],
  ["indica", "Indica", "Intuição; revelar o oculto atrás das aparências."],
  ["ipeRoxo", "Ipê Roxo", "Traumas e estresse sem saída; esperança e fortalecimento do Eu."],
  ["jasmimMadagascar", "Jasmim Madagascar", "Situação de engolir sapo; bloqueio laríngeo."],
  ["laurusNobilis", "Laurus Nobilis", "Romper ligações com o passado; medos profundos."],
  ["lavanda", "Lavanda de Saint Germain", "Harmonização mental; bebês e cólicas."],
  ["leucantha", "Leucantha SG", "Vínculo materno; maturação do instinto maternal."],
  ["limao", "Limão SG", "Personalidade amarga; depurativo e limpeza."],
  ["lirioPaz", "Lírio da Paz", "Proteção de envolvimentos prejudiciais; paz interna."],
  ["lirioReal", "Lírio Real", "Libertação de traumas; reorganização dos chakras."],
  ["lisiandra", "Lisiandra", "Padrão de pressa e desorganização; calma no viver diário."],
  ["lotusAzul", "Lótus Azul", "Expansão de consciência; desobstrução energética profunda."],
  ["lotusEgito", "Lótus do Egito", "Expansão da consciência; purificação psíquica."],
  ["lotusMagnolia", "Lótus Magnólia", "Proteção; desespero antigo; paixão à pureza."],
  ["maca", "Maçã SG", "Estagnação e acúmulo do inútil; ação e disposição."],
  ["madressilva", "Madressilva SG", "Libertação do passado astral; apego a lembranças."],
  ["mangifera", "Mangífera", "Perda de fé após sofrimento; retomada de esperança."],
  ["margarida", "Margarida de Saint Germain", "Cura misericordiosa; dislexia e transtornos de aprendizagem."],
  ["melissa", "Melissa SG", "Alegria, criança interior e superação de obstáculos."],
  ["mimosinha", "Mimosinha", "Timidez; coragem para se expor e comunicar."],
  ["monterey", "Monterey", "Culpa consciente ou inconsciente; autoamor."],
  ["myrtus", "Myrtus", "Libertação de egrégoras e mental dominante alheio."],
  ["olivaFatima", "Oliva de Fátima", "Perseverança e forças vitais sob pressão."],
  ["panicum", "Panicum SG", "Síndrome do pânico; controle sobre a mente."],
  ["patiens", "Patiens", "Paciência, flexibilidade e tolerância sob pressão."],
  ["pauBrasil", "Pau Brasil", "Descoberta de vocação e talentos latentes."],
  ["pectus", "Pectus", "Submissão e resignação; mágoas por humilhação."],
  ["pepo", "Pepo", "Apego material; medo da pobreza."],
  ["perpetua", "Perpétua", "Perdas irreparáveis; lição do desapego."],
  ["pinheiroLiberacao", "Pinheiro Libertação", "Libertação de prisões energéticas de vidas passadas."],
  ["piper", "Piper", "Rigidez mental; hérnia de disco; criatividade bloqueada."],
  ["poaiaRosa", "Poaia Rosa", "Sincronicidade e nova ordem planetária."],
  ["populusPanicum", "Populus Panicum", "Pânico coletivo em catástrofes."],
  ["purpureum", "Purpureum", "Limpeza profunda; TPM e atitudes extremas."],
  ["rosaRosa", "Rosa Rosa", "Amor incondicional; remove ódio."],
  ["saintGermain", "Saint Germain", "Misericórdia divina; depressão profunda e reconexão espiritual."],
  ["saoMiguel", "São Miguel", "Proteção; desmanchar trabalhos de magia negra."],
  ["sapientum", "Sapientum", "Sabedoria de vidas passadas; maturidade e impotência sexual."],
  ["scorpius", "Scorpius", "Personalidade escorpião; crítica destrutiva."],
  ["sergipe", "Sergipe", "Abertura mental; clareza em sofrimento."],
  ["sorgo", "Sorgo", "Carência afetiva; integração e pertencimento."],
  ["thea", "Thea", "Estudante; concentração e combate à dispersão."],
  ["tuia", "Tuia SG", "Impulsos sexuais descontrolados; pureza."],
  ["triunfo", "Triunfo", "Negativismo materialista; intuição e Eu Superior."],
  ["umbellata", "Umbellata", "Proteção profunda; medos infundados e espectros."],
  ["unitatum", "Unitatum", "Rejeição na infância; integração masculino-feminino."],
  ["varus", "Varus", "Alinhamento da coluna; culpa e conflito ideal vs. realidade."],
  ["verbena", "Verbena SG", "Rigidez mental; convicções inflexíveis."],
  ["vitoria", "Vitória", "Inferioridade e inadequação; autenticidade."],
  ["wedelia", "Wedélia", "Corrupção, ganância e materialismo desviado."],
];

const sgFormulas = [
  ["emergencial", "Fórmula Emergencial", "Desalinhos drásticos; acidentes, traumas e emergências."],
  ["animoEquilibrio", "Ânimo e Equilíbrio", "Depressão profunda; força interior e esperança."],
  ["antiEstresse", "Anti-Estresse", "Estresse e desânimo; domínio em momentos de pressão."],
  ["autoEstima", "Autoestima e Vitalidade", "Amor próprio, autoconfiança e vitalidade."],
  ["bomSono", "Bom Sono", "Insônia por preocupação e ansiedade noturna."],
  ["calma", "Calma e Tranquilidade", "Nervosismo e agitação interna."],
  ["detox", "Detox", "Limpeza de toxinas físicas e energéticas; mudança de hábitos."],
  ["espiritualidade", "Espiritualidade e Meditação", "Intuição, foco e conexão espiritual."],
  ["estudante", "Estudante", "Concentração, memória e perseverança nos estudos."],
  ["integracaoFamiliar", "Integração Familiar", "Harmonia, perdão e reestruturação familiar."],
  ["leucantha", "Leucantha 20ml", "Insegurança, rejeição materna e dificuldades vocacionais."],
  ["meiaIdade", "Meia Idade", "TPM, menopausa, andropausa e variações hormonais."],
  ["panicum", "Panicum (fórmula)", "Síndrome do pânico; medo irracional."],
  ["prosperidade", "Prosperidade", "Abundância e propósito de vida."],
  ["protecao", "Proteção", "Proteção energética; vampirismo e limpeza ambiental."],
  ["ansiedade", "Sensação de Ansiedade", "Preocupação excessiva; paciência e flexibilidade (não ansiolítico)."],
];

const pt = {};
const en = {};
const es = {};

const groups = {
  fear: ["Para o medo", "For fear"],
  uncertainty: ["Para a incerteza", "For uncertainty"],
  lackInterest: ["Falta de interesse nas circunstâncias atuais", "Lack of interest in present circumstances"],
  loneliness: ["Para a solidão", "For loneliness"],
  susceptibility: ["Susceptibilidade a influências e ideias", "Oversensitivity to influences and ideas"],
  despondency: ["Desânimo e desespero", "Despondency and despair"],
  overCare: ["Preocupação excessiva com o bem-estar dos outros", "Over-concern for others' welfare"],
};
for (const [k, [p, e]] of Object.entries(groups)) {
  pt[`it.ref.bach.g.${k}`] = p;
  en[`it.ref.bach.g.${k}`] = e;
  es[`it.ref.bach.g.${k}`] = e;
}

pt["it.ref.bach.intro"] = "Dr. Bach catalogou 38 essências em 7 grupos emocionais. Selecione pelo estado emocional atual — negativo → positivo — não apenas pelo diagnóstico.";
en["it.ref.bach.intro"] = "Dr. Bach catalogued 38 essences in 7 emotional groups. Select by current emotional state — negative → positive — not by disease label alone.";
es["it.ref.bach.intro"] = "Dr. Bach catalogó 38 esencias en 7 grupos emocionales. Seleccione por el estado emocional actual.";
pt["it.ref.bach.title"] = "Florais de Bach (38 essências)";
en["it.ref.bach.title"] = "Bach flower essences (38)";
es["it.ref.bach.title"] = "Flores de Bach (38 esencias)";
pt["it.ref.bach.rescueTitle"] = "Rescue / blends de emergência";
en["it.ref.bach.rescueTitle"] = "Rescue / emergency blends";
pt["it.ref.bach.rescue"] = "Rescue Remedy";
en["it.ref.bach.rescue"] = "Rescue Remedy";
pt["it.ref.bach.rescueInd"] = "Estresse agudo, choque, acidentes e provas.";
en["it.ref.bach.rescueInd"] = "Acute stress, shock, accidents and exams.";
pt["it.ref.bach.rescueNight"] = "Rescue Night";
en["it.ref.bach.rescueNight"] = "Rescue Night";
pt["it.ref.bach.rescueNightInd"] = "Dificuldade de sono com ansiedade.";
en["it.ref.bach.rescueNightInd"] = "Sleep difficulty with anxiety.";

for (const [key, [neg, pos]] of Object.entries(bachNegPos)) {
  pt[`it.ref.bach.${key}`] = bachLabels[key];
  en[`it.ref.bach.${key}`] = bachLabels[key];
  es[`it.ref.bach.${key}`] = bachLabels[key];
  pt[`it.ref.bach.${key}.neg`] = neg;
  en[`it.ref.bach.${key}.neg`] = neg;
  es[`it.ref.bach.${key}.neg`] = neg;
  pt[`it.ref.bach.${key}.pos`] = pos;
  en[`it.ref.bach.${key}.pos`] = pos;
  es[`it.ref.bach.${key}.pos`] = pos;
}

pt["it.ref.sg.title"] = "Essências florais de Saint Germain";
en["it.ref.sg.title"] = "Saint Germain flower essences";
es["it.ref.sg.title"] = "Esencias florales Saint Germain";
pt["it.ref.sg.intro"] = "Sistema Saint Germain — essências sintonizadas para equilíbrio bioenergético dos corpos físico e suprafísicos.";
en["it.ref.sg.intro"] = "Saint Germain System — essences for bioenergetic balance of physical and subtle bodies.";
es["it.ref.sg.intro"] = "Sistema Saint Germain — esencias para equilibrio bioenergético.";

pt["it.ref.sgf.title"] = "Fórmulas compostas Saint Germain";
en["it.ref.sgf.title"] = "Saint Germain compound formulas";
es["it.ref.sgf.title"] = "Fórmulas compuestas Saint Germain";
pt["it.ref.sgf.intro"] = "Combinações prontas para quadros emocionais e energéticos frequentes.";
en["it.ref.sgf.intro"] = "Ready-made blends for common emotional and energetic pictures.";
es["it.ref.sgf.intro"] = "Combinaciones listas para cuadros emocionales frecuentes.";

for (const [id, label, ind] of sgEssences) {
  pt[`it.ref.sg.${id}`] = label;
  en[`it.ref.sg.${id}`] = label;
  es[`it.ref.sg.${id}`] = label;
  pt[`it.ref.sg.${id}Ind`] = ind;
  en[`it.ref.sg.${id}Ind`] = ind;
  es[`it.ref.sg.${id}Ind`] = ind;
}
for (const [id, label, ind] of sgFormulas) {
  pt[`it.ref.sgf.${id}`] = label;
  en[`it.ref.sgf.${id}`] = label;
  es[`it.ref.sgf.${id}`] = label;
  pt[`it.ref.sgf.${id}Ind`] = ind;
  en[`it.ref.sgf.${id}Ind`] = ind;
  es[`it.ref.sgf.${id}Ind`] = ind;
}

const floralUi = {
  "it.ref.floral.cat.bach": ["Florais de Bach", "Bach essences"],
  "it.ref.floral.cat.bachRescue": ["Rescue / emergência", "Rescue / emergency"],
  "it.ref.floral.cat.saintGermain": ["Essências Saint Germain", "Saint Germain essences"],
  "it.ref.floral.cat.saintGermainFormula": ["Fórmulas compostas SG", "SG compound formulas"],
  "it.ref.floral.cat.custom": ["Personalizado", "Custom"],
  "it.ref.floral.custom": ["Fórmula personalizada", "Custom formula"],
  "it.ref.floral.customInd": ["Combinação individualizada de essências.", "Individualized essence combination."],
  "rx.floralProductSelect": ["Essência / fórmula floral", "Flower essence / formula"],
  "rx.floralProductPlaceholder": ["Selecione da biblioteca…", "Select from library…"],
  "rx.addFloral": ["Adicionar essência floral", "Add flower essence"],
  "rx.itemKind.floral": ["Terapia floral", "Flower therapy"],
  "nm.mod.floralPrescriptions.title": ["Prescrições florais", "Floral prescriptions"],
  "nm.mod.floralPrescriptions.desc": ["Prescrever essências de Bach, Saint Germain e fórmulas compostas.", "Prescribe Bach, Saint Germain essences and compound formulas."],
  "it.ref.florais.4": ["Posologia usual: 4 gotas, 4 vezes ao dia, sob a língua ou diluídas em água.", "Usual posology: 4 drops, 4 times daily, under tongue or in water."],
  "it.tpl.florais.system": ["Sistema / linha", "System / line"],
  "it.tpl.florais.system.bach": ["Bach", "Bach"],
  "it.tpl.florais.system.sg": ["Saint Germain", "Saint Germain"],
  "it.tpl.florais.system.mixed": ["Misto / individualizado", "Mixed / individualized"],
  "it.tpl.florais.product": ["Essência ou fórmula (referência)", "Essence or formula (reference)"],
  "it.tpl.florais.presentation.floral": ["Gotas (30 ml)", "Drops (30 ml)"],
  "it.tpl.florais.presentation.spray": ["Spray ambiental", "Environmental spray"],
  "it.tpl.florais.presentation.stock": ["Estoque (sem diluição)", "Stock bottle"],
};
for (const [k, [p, e]] of Object.entries(floralUi)) {
  pt[k] = p;
  en[k] = e;
  es[k] = e;
}

pt["nm.practice.florais.subtitle"] = "Florais de Bach, essências e fórmulas Saint Germain para equilíbrio emocional e bioenergético.";
en["nm.practice.florais.subtitle"] = "Bach essences and Saint Germain essences/compounds for emotional and bioenergetic balance.";
es["nm.practice.florais.subtitle"] = "Flores de Bach, esencias y fórmulas Saint Germain para equilibrio emocional.";
pt["nm.practice.florais.cardDesc"] = "Bach (38), Rescue, essências SG e 16 fórmulas compostas.";
en["nm.practice.florais.cardDesc"] = "Bach (38), Rescue, SG essences and 16 compound formulas.";
es["nm.practice.florais.cardDesc"] = "Bach (38), Rescue, esencias SG y 16 fórmulas compuestas.";
pt["nm.practice.florais.banner"] = "Essências florais são altamente diluídas. Foque no quadro emocional e energético. Não substituem tratamento médico quando indicado.";
en["nm.practice.florais.banner"] = "Flower essences are highly dilute. Focus on emotional and energetic picture. Do not replace medical care when indicated.";
es["nm.practice.florais.banner"] = "Las esencias florales son muy diluidas. Enfoque en el cuadro emocional y energético.";

const tmplKeys = {
  "nm.mod.floralTemplates.title": ["Modelos de prescrição floral", "Floral prescription templates"],
  "nm.mod.floralTemplates.subtitle": ["Combinações sugeridas e modelos salvos para reutilizar em consultas.", "Suggested blends and saved models to reuse in consultations."],
  "nm.mod.floralTemplates.desc": ["Modelos sugeridos e combinações salvas.", "Suggested and saved floral blends."],
  "nm.mod.floralTemplates.hint": ["Escolha um modelo sugerido ou abra uma prescrição nova e salve como modelo ao final.", "Pick a suggested template or create a prescription and save it as a template."],
  "nm.mod.floralTemplates.startersTitle": ["Modelos sugeridos", "Suggested templates"],
  "nm.mod.floralTemplates.savedTitle": ["Seus modelos salvos", "Your saved templates"],
  "nm.mod.floralTemplates.useStarter": ["Usar na prescrição", "Use in prescription"],
  "nm.mod.floralTemplates.empty": ["Nenhum modelo floral salvo ainda.", "No saved floral templates yet."],
  "nm.mod.floralTemplates.emptyHint": ["Crie uma prescrição floral e toque em \"Salvar como modelo\".", "Create a floral prescription and tap \"Save as template\"."],
  "nm.mod.floralTemplates.items": ["itens", "items"],
  "nm.mod.floralTemplates.days": ["dias", "days"],
  "nm.mod.floralTemplates.deleteConfirm": ["Excluir este modelo?", "Delete this template?"],
  "it.tmpl.floral.rescue": ["Rescue — emergência", "Rescue — emergency"],
  "it.tmpl.floral.rescueInstr": ["4 gotas sob a língua em situações de estresse agudo. Evite sabores fortes 15 min antes/depois.", "4 drops under tongue for acute stress. Avoid strong flavors 15 min before/after."],
  "it.tmpl.floral.bomSono": ["Bom Sono (SG)", "Good Sleep (SG)"],
  "it.tmpl.floral.bomSonoInstr": ["Tomar conforme posologia; evitar telas antes de dormir.", "Take as directed; avoid screens before sleep."],
  "it.tmpl.floral.antiEstresse": ["Anti-Estresse (SG)", "Anti-Stress (SG)"],
  "it.tmpl.floral.antiEstresseInstr": ["Uso diário em períodos de pressão elevada.", "Daily use during high-pressure periods."],
  "it.tmpl.floral.ansiedade": ["Sensação de Ansiedade (SG)", "Anxiety Sensation (SG)"],
  "it.tmpl.floral.ansiedadeInstr": ["Não substitui ansiolítico; foco em preocupação e rotina.", "Not a substitute for anxiolytics; targets worry and routine stress."],
  "it.tmpl.floral.panicum": ["Panicum — síndrome do pânico (SG)", "Panicum — panic (SG)"],
  "it.tmpl.floral.panicumInstr": ["Acompanhar com suporte terapêutico; reavaliar em 2–4 semanas.", "Combine with therapeutic support; reassess in 2–4 weeks."],
  "it.tmpl.floral.protecao": ["Proteção energética (SG)", "Energy protection (SG)"],
  "it.tmpl.floral.protecaoInstr": ["Após ambientes ou contatos desgastantes; pode usar como spray ambiental.", "After draining environments or contacts; may use as room spray."],
  "it.tmpl.floral.emergencial": ["Fórmula Emergencial (SG)", "Emergency formula (SG)"],
  "it.tmpl.floral.emergencialInstr": ["Situações de desalinhamento abrupto; repetir se necessário com intervalo.", "Abrupt emotional/energetic distress; repeat if needed with spacing."],
  "it.tmpl.floral.estudante": ["Estudante (SG)", "Student (SG)"],
  "it.tmpl.floral.estudanteInstr": ["Durante preparação para provas e períodos de foco prolongado.", "During exam prep and extended focus periods."],
  "it.tmpl.floral.bachMedo": ["Bach — medos (Mimulus + Aspen)", "Bach — fears (Mimulus + Aspen)"],
  "it.tmpl.floral.bachMedoInstr": ["Medos concretos e apreensões vagas; reavaliar quadro emocional.", "Concrete fears and vague apprehension; reassess emotional picture."],
  "it.tmpl.floral.bachMente": ["Bach — mente acelerada", "Bach — racing mind"],
  "it.tmpl.floral.bachMenteInstr": ["Pensamentos repetitivos e dispersão; uso noturno se indicado.", "Repetitive thoughts and dispersion; night use if indicated."],
  "it.tmpl.floral.dislexia": ["SG — aprendizagem (Margarida + combo)", "SG — learning support blend"],
  "it.tmpl.floral.dislexiaInstr": ["Combinação referenciada para dislexia e transtornos de aprendizagem; uso mínimo 60 dias.", "Referenced blend for learning difficulties; minimum 60 days."],
};
for (const [k, [p, e]] of Object.entries(tmplKeys)) {
  pt[k] = p;
  en[k] = e;
  es[k] = e;
}

const finalOut = `/** Floral reference translations — Bach, Saint Germain, prescriptions UI */
export const floraisReferencePt: Record<string, string> = ${JSON.stringify(pt, null, 2)};

export const floraisReferenceEn: Record<string, string> = ${JSON.stringify(en, null, 2)};

export const floraisReferenceEs: Record<string, string> = ${JSON.stringify(es, null, 2)};
`;

fs.writeFileSync("src/lib/i18n/florais-reference-i18n.ts", finalOut);
console.log("Written", Object.keys(pt).length, "PT keys");
