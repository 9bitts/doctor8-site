# Análise — Cannabis Medicinal na Prescrição (médicos e dentistas) + Prompt para o Cursor

Data: 2026-07-14 · Análise sem alteração de código
Escopo: novo item prescritível "Cannabis medicinal" na tela de prescrições, com busca em catálogo e clique para adicionar à receita. Prescritores: médicos e cirurgiões-dentistas.

---

## 1. Existe um banco de dados genérico (sem marca) para download?

**Não existe um banco genérico, sem marcas, pronto para baixar em PDF/planilha.** O que existe publicamente:

| Fonte | O que é | Formato | Limitação |
|---|---|---|---|
| [Consulta Anvisa — Produtos de cannabis](https://consultas.anvisa.gov.br/#/cannabis/) | Lista oficial dos ~35 produtos **registrados** no Brasil (RDC 327/2019) | Consulta web (sem botão de exportar) | Contém marcas/fabricantes |
| Nota Técnica 57/2023 Anvisa (importação) | ~542 produtos com autorização de **importação** | PDF | Contém marcas |
| [Dados Abertos Anvisa](https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv) | CSV de medicamentos registrados | CSV | Produtos de cannabis da RDC 327 ficam em lista separada, não neste CSV |

**Conclusão/recomendação:** o mercado (plataformas de prescrição e cursos de endocanabinologia) não prescreve por marca, e sim por **composição genérica**: espectro (isolado / broad spectrum / full spectrum), proporção CBD:THC, concentração em mg/mL e forma farmacêutica. É exatamente o mesmo caminho já usado no projeto para fitoterápicos (FFFB/MFFB → `data/fitoterapicos/*.json` → seed). O prompt abaixo instrui o Cursor a **gerar o seed genérico** a partir da matriz de composições padrão do mercado — não é preciso baixar nada. Se quiser complementar depois com a lista oficial da Anvisa (com marcas), dá para copiar da consulta web e importar como camada extra.

## 2. Contexto regulatório (aplicado no prompt)

- RDC 327/2019: produtos de cannabis exigem prescrição; THC ≤ 0,2% → **receituário tipo B (azul)**; THC > 0,2% → **receituário tipo A (amarelo)**, restrito a pacientes paliativos/refratários.
- RDC 1.015/2026: incluiu **cirurgiões-dentistas** entre os prescritores (usos odonto: DTM, bruxismo, dor orofacial, ansiedade pré-operatória, pós-operatório).
- Gate no sistema: apenas profissões médico e dentista veem/adicionam o item (validar também no servidor).

## 3. Arquitetura mapeada (onde encaixa)

O projeto já tem o padrão "Medicina Natural" com categorias plugáveis — cannabis entra como nova categoria:

- `src/lib/medicina-natural/item-types.ts` — `CATEGORIA_PRATICA` (FITOTERAPICO, FLORAL, AROMATERAPIA, HOMEOPATIA, APITERAPIA) + interfaces `Detalhes*`
- `prisma/schema.prisma` — enum `CategoriaPraticaMedicinaNatural` + model `MedicinaNaturalItem`
- `data/<categoria>/seed.json` + `prisma/seeds/<categoria>.ts` (usa `upsertMedicinaNaturalItems` de `prisma/seeds/medicina-natural-shared.ts`)
- `src/lib/prescription-item-kind.ts` — `PrescriptionItemKind`
- `src/lib/medicina-natural-catalog/prescription-search.ts` — `PrescriptionItemSearchMode` + mapas `SEARCH_MODE_TO_CATEGORIA` / `SEARCH_MODE_TO_ITEM_KIND`
- UI da receita: `src/app/(dashboard)/professional/prescriptions/components/{MedicationSearch,usePrescriptionPage,PrescriptionForm}.tsx` + `MN_RX_SEARCH_TABS`
- Busca: `src/app/api/professional/medicina-natural/search/route.ts` (já filtra por categoria)
- Catálogo: `src/components/medicina-natural-catalog/{MedicinaNaturalCatalog,MedicinaNaturalItemDetail}.tsx`
- PDF: `src/app/api/professional/prescriptions/[id]/pdf/route.ts`
- i18n: `src/lib/i18n/translations.ts` e `natural-medicine-i18n.ts`

---

## 4. PROMPT PARA O CURSOR (copiar tudo abaixo)

```
Você vai adicionar CANNABIS MEDICINAL como novo tipo de item prescritível no projeto doctor8 (Next.js App Router + Prisma), seguindo o padrão já existente de "Medicina Natural" (fitoterápicos, florais, homeopatia, aromaterapia, apiterapia). O médico e o cirurgião-dentista devem conseguir, na tela de prescrição, abrir a aba "Cannabis medicinal", buscar por composição (ex.: "CBD 200", "full spectrum", "1:1") e clicar para adicionar o item à receita. Commits pequenos por etapa; typecheck + testes ao fim de cada etapa. NÃO altere o comportamento das demais categorias.

CONTEXTO REGULATÓRIO (aplicar no código):
- RDC 327/2019 Anvisa: THC ≤ 0,2% → receituário tipo B (azul); THC > 0,2% → receituário tipo A (amarelo), restrito a pacientes refratários/cuidados paliativos.
- RDC 1.015/2026: dentistas podem prescrever. Gate: apenas profissões médico e dentista (usar o helper de profissões existente em src/lib/professions.ts) — no cliente E no servidor.

=== ETAPA 1 — Dados: gerar data/cannabis/seed.json ===
Crie data/cannabis/seed.json no mesmo formato dos seeds de medicina natural (compatível com MedicinaNaturalItemRecord + normalização usada em prisma/seeds/medicina-natural-shared.ts). Gere ~50 itens GENÉRICOS (sem marca) combinando a matriz padrão do mercado brasileiro:

ÓLEOS (via oral/sublingual, frasco 30 mL — forma dominante):
- CBD isolado: 10, 20, 50, 100, 150, 200 mg/mL
- CBD broad spectrum (THC não detectável): 20, 50, 100, 150, 200 mg/mL
- CBD full spectrum (THC ≤ 0,2%): 6, 17, 23, 36, 50, 79, 100, 150, 200 mg/mL
- Balanceado full spectrum CBD:THC 1:1 — 10+10, 15+15, 25+25 mg/mL (tipoReceituario A)
- THC-dominante full spectrum (ex.: THC 25 mg/mL : CBD 1 mg/mL; THC 50 mg/mL) (tipoReceituario A)
- CBG-dominante (CBG 20 mg/mL + CBD 20 mg/mL); CBN para insônia (CBN 10 + CBD 20 mg/mL)
CÁPSULAS: CBD isolado/broad 10, 25, 50 mg
GOMAS/PASTILHAS: CBD 10, 25 mg
TÓPICOS: creme/pomada CBD 100–500 mg/embalagem (uso dermatológico/dor localizada)
SPRAY SUBLINGUAL: CBD 25 mg/mL

Para cada item preencher: slug; nome (ex.: "Óleo CBD full spectrum 50 mg/mL"); nomesAlternativos (ex.: ["Canabidiol 50 mg/mL", "CBD 5%"]); indicacoes (dor crônica, epilepsia refratária, ansiedade, insônia, TEA, Parkinson, fibromialgia, náusea quimioterapia — e nos itens pertinentes as odontológicas: DTM, bruxismo, dor orofacial, ansiedade pré-operatória); contraindicacoes (hipersensibilidade, gestação/lactação, cautela hepatopatia grave); precaucoes; interacoesMedicamentosas (anticonvulsivantes — clobazam/valproato, varfarina, inibidores/indutores CYP3A4 e CYP2C19, depressores do SNC); posologia inicial sugerida ("iniciar com dose baixa e titular — start low, go slow", ex.: 0,1–0,3 mL 2x/dia); viaAdministracao; statusRegulatorio = "MEDICAMENTO_REGISTRADO" para composições com produto registrado na Anvisa e "USO_TRADICIONAL_SEM_REGISTRO" NÃO usar — para importados/manipulados usar o status mais adequado do enum existente (avaliar; se necessário, adicionar "PRODUTO_AUTORIZADO_ANVISA" ao enum STATUS_REGULATORIO com migration); fontes (RDC 327/2019, RDC 660/2022, RDC 1.015/2026); alertaGestacaoPediatria; detalhesEspecificos (ver DetalhesCannabis abaixo); searchText via buildMedicinaNaturalSearchText.
Adicione _meta no topo do JSON (fonte, data, observação "catálogo genérico por composição — sem marcas, conforme prática de mercado e RDC 327/2019").

=== ETAPA 2 — Tipos ===
Em src/lib/medicina-natural/item-types.ts:
- Adicionar "CANNABIS" a CATEGORIA_PRATICA.
- Criar interface DetalhesCannabis: espectro ("isolado" | "broad_spectrum" | "full_spectrum"); canabinoideDominante ("CBD" | "THC" | "CBG" | "CBN" | "balanceado"); concentracaoCbdMgMl?: number; concentracaoThcMgMl?: number; outrosCanabinoides?: string; proporcaoCbdThc?: string (ex.: "20:1", "1:1"); formaFarmaceutica: "oleo" | "capsula" | "goma" | "topico" | "spray_sublingual"; volumeEmbalagem?: string; tipoReceituario: "A" | "B"; thcAcimaLimite: boolean (true quando THC > 0,2% → exige receituário A e justificativa).
- Incluir DetalhesCannabis na union de detalhesEspecificos e no zod schema do record.

=== ETAPA 3 — Prisma ===
- Adicionar CANNABIS ao enum CategoriaPraticaMedicinaNatural em prisma/schema.prisma + migration (npx prisma migrate dev --name add-cannabis-categoria).
- Criar prisma/seeds/cannabis.ts no padrão de prisma/seeds/fitoterapicos.ts (ler data/cannabis/seed.json, normalizar, upsertMedicinaNaturalItems por slug). Registrar no runner de seeds existente.

=== ETAPA 4 — Tipo de item da receita ===
Em src/lib/prescription-item-kind.ts:
- Adicionar "cannabis" a PrescriptionItemKind.
- NÃO incluir em FREE_TEXT_KINDS (item vem do catálogo, com posologia editável).
- Incluir "cannabis" em isNaturalMedicineItemKind.
Verificar todos os switch/exhaustive checks que usam PrescriptionItemKind (PDF, templates, farmácia) e cobrir o novo kind.

=== ETAPA 5 — Busca na prescrição ===
Em src/lib/medicina-natural-catalog/prescription-search.ts:
- Adicionar "cannabis" a PrescriptionItemSearchMode; mapear em SEARCH_MODE_TO_CATEGORIA → "CANNABIS" e SEARCH_MODE_TO_ITEM_KIND → "cannabis".
Garantir que src/app/api/professional/medicina-natural/search/route.ts aceita a nova categoria e que o searchText indexa concentração/espectro/proporção (buscas tipo "cbd 200", "full spectrum", "1:1", "thc").
GATE SERVIDOR: na rota de busca (categoria CANNABIS) e no POST/PUT de prescrições, rejeitar com 403 se a profissão do profissional não for médico ou dentista.

=== ETAPA 6 — UI da receita ===
Em MN_RX_SEARCH_TABS + src/app/(dashboard)/professional/prescriptions/components/{MedicationSearch,usePrescriptionPage,PrescriptionForm}.tsx:
- Nova aba "Cannabis medicinal" (ícone folha/cannabis do lucide), visível SOMENTE para médico e dentista.
- Resultado da busca mostra: nome, espectro, proporção CBD:THC, forma farmacêutica e badge do receituário ("Receituário B" verde-azulado / "Receituário A — controle especial" âmbar).
- Ao clicar, adiciona o item à receita com posologia sugerida pré-preenchida e editável (padrão dos demais itens de medicina natural).
- Se thcAcimaLimite = true, exibir aviso não bloqueante: "THC > 0,2% — exige receituário tipo A e paciente refratário/cuidados paliativos (RDC 327/2019)".

=== ETAPA 7 — PDF da receita ===
Em src/app/api/professional/prescriptions/[id]/pdf/route.ts (+ pdf do terapeuta integrativo se aplicável):
- Renderizar o item cannabis com composição completa (espectro, mg/mL de CBD/THC, forma, volume).
- Rodapé/observação automática quando houver item cannabis: "Produto à base de Cannabis — RDC 327/2019. Venda sob prescrição, receituário tipo <A|B>."
- Marcar a prescrição como controlada (mesmo fluxo usado para controlled do DrugCatalog, se existir flag na Prescription).

=== ETAPA 8 — Catálogo de consulta ===
Em src/components/medicina-natural-catalog/{MedicinaNaturalCatalog,MedicinaNaturalItemDetail}.tsx: renderizar a categoria CANNABIS e os campos de DetalhesCannabis (tabela de composição, receituário, interações). Respeitar o mesmo gate de profissão na visibilidade da categoria.

=== ETAPA 9 — i18n ===
Adicionar chaves pt/en/es em src/lib/i18n/translations.ts e natural-medicine-i18n.ts: nome da aba, badges de receituário, avisos, labels de DetalhesCannabis.

=== ETAPA 10 — Testes ===
- Unit: prescription-search (modo cannabis → categoria/kind), prescription-item-kind, zod do DetalhesCannabis, seed parser (50 itens válidos, slugs únicos, tipoReceituario coerente com thcAcimaLimite).
- API: busca cannabis 403 para profissão não autorizada (ex.: nutricionista), 200 para médico e dentista; POST prescrição com item cannabis por profissão não autorizada → 403.
- E2E (playwright, padrão dos e2e existentes): médico busca "cbd 200", adiciona à receita, gera PDF com a observação da RDC.

CRITÉRIOS DE ACEITE:
1. Médico e dentista veem a aba "Cannabis medicinal" na prescrição; demais profissões não.
2. Busca por "cbd", "200", "full spectrum", "1:1" retorna itens do catálogo genérico.
3. Clique adiciona o item à receita com posologia editável; item sai corretamente no PDF com a observação regulatória e o tipo de receituário.
4. Gates de profissão aplicados também no servidor (busca e gravação).
5. Seed idempotente (rodar 2x não duplica). Typecheck, lint e testes verdes.
```

---

## 5. Fontes

- [Consulta Anvisa — Produtos de cannabis registrados](https://consultas.anvisa.gov.br/#/cannabis/)
- [RDC 327/2019 (PDF, Ministério da Saúde)](https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2019/rdc0327_09_12_2019.pdf)
- [Anvisa — página de importação de derivados de cannabis](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/cannabis)
- [ConJur — Cannabis na odontologia (RDC 1.015/2026, dentistas prescritores)](https://www.conjur.com.br/2026-jun-13/cannabis-na-odontologia/)
- [Cannabis & Saúde — Quem pode prescrever canabidiol](https://www.cannabisesaude.com.br/quem-pode-prescrever-canabidiol/)
- [SciELO — Regulação sanitária de produtos derivados de Cannabis no Brasil](https://www.scielosp.org/article/sdeb/2025.v49n147/e10408/en/)
