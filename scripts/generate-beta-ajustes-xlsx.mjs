/**
 * Generates Doctor Beta - Ajustes.xlsx with updated status (Jul 2026).
 * Run: npx --yes -p xlsx node scripts/generate-beta-ajustes-xlsx.mjs
 */
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { writeFileXLSX, utils } = XLSX;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "docs", "Doctor Beta - Ajustes.xlsx");

const rows = [
  ["#", "Requisito", "Status", "Fase", "Commit", "Observação"],
  [1, "Tirar foto de anotações (manuscritas/digitadas) e fazer upload", "Em teste", "A/D", "7aca939", "capture=environment no upload paciente e ficha médica — validar mobile"],
  [2, "Classificar exames/registros por data (decrescente)", "Concluído", "B", "bdb9666", "Timeline e listas ordenadas por createdAt desc"],
  [3, "WhatsApp abrir direto do sistema", "Bloqueado", "—", "—", "Aguarda config Meta Cloud API (#17)"],
  [4, "Mensagens com link direto para abrir documento", "Em teste", "A/F/I", "ca68faad", "MessageBody linkifica URLs; share usa path in-app — validar Denise"],
  [5, "Botão Voltar dentro da mensagem", "Concluído", "A", "7aca939", "returnUrl + botão voltar na conversa"],
  [6, "Renomear Adicionar etiqueta → Adicionar alerta", "Concluído", "B", "bdb9666", "i18n e UI atualizados"],
  [7, "Fluxo de direcionamento (link para outro médico/paciente)", "Em teste", "E/F/J", "13b40280", "Encaminhamento + links in-app — validar fluxo completo"],
  [8, "Mensagens sem link direto ao documento", "Em teste", "F/I", "906a636f", "Notificações e mensagens com link — validar Denise"],
  [9, "Botão Voltar em mensagens", "Concluído", "A", "7aca939", "Mesmo fix do #5 (profissional reutiliza página paciente)"],
  [10, "Texto do botão de alerta no perfil médico", "Concluído", "B", "bdb9666", "Labels de alerta atualizados"],
  [11, "Seção de Alerta reinicia/retorna tudo ao interagir", "Em teste", "B/G", "49a097f8", "PatientChartTags sync + fixes — validar Denise"],
  [12, "Fluxo de encaminhamento entre profissionais", "Em teste", "E/J", "13b40280", "ReferralPanel + API + mensagem ao colega"],
  [13, "Mensagens de compartilhamento não chegam", "Em teste", "F/I/J", "906a636f", "Share cria message + notification — validar entrega"],
  [14, "Revisar medicamentos/documentos antes da assinatura digital", "Concluído", "B/H/I", "906a636f", "Revisão pós-save: receita, exame e documento clínico"],
  [15, "Links de receitas quebrados", "Concluído", "pré-A", "764d108", "E-mail aponta para /patient/prescriptions"],
  [16, "E-mail não abre no Doctor", "Concluído", "pré-A", "764d108", "Mesmo fix do #15"],
  [17, "WhatsApp não recebe mensagens", "Bloqueado", "—", "—", "Aguarda config Meta Cloud API"],
  [18, "Erro relatado pela Cláudia", "Pendente", "—", "—", "Sem detalhe na planilha — precisa descrição"],
  [19, "Retirar texto padrão do perfil do usuário", "Concluído", "E", "f6bcbb52", "Placeholders no perfil público"],
  [20, "Médico visualizar receita PDF", "Concluído", "C/H", "5c558eef", "openAuthenticatedPdf na revisão e EmissionCardActions"],
  [21, "BirdID: pedir só no 1º login ou a cada 24h", "Concluído", "D", "2780bf34", "Cookie recentAuth 24h + auto-start sign"],
  [22, "Troca de senha por SMS não funciona", "Bloqueado", "D", "10be62df", "AWS SMS em sandbox — UI oculta até aprovação"],
  [23, "Prescrição livre: colar lote grande de remédios", "Concluído", "C", "21952b52", "Bulk paste na emissão de receita"],
  [24, "Itens não medicamentosos na prescrição", "Concluído", "J", "13b40280", "addDevice + texto livre gera itemKind=device"],
  [25, "Tela texto livre / importação do Mined", "Em teste", "J", "13b40280", "Colar + importar .txt/.json — sem API Mined"],
  [26, "Botões rápidos de ação no prontuário", "Concluído", "C", "21952b52", "ChartClinicalActions no cabeçalho da ficha"],
  [27, "Mover blocos de botões para o topo da ficha", "Concluído", "C", "21952b52", "Ações clínicas no topo"],
  [28, "Trocar etiqueta Alergia por busca com lupa", "Concluído", "B", "bdb9666", "Busca CID/alergia com lupa"],
  [29, "Botão dedicado [Alertas] na ficha", "Concluído", "B", "bdb9666", "PatientChartTags + botão alertas"],
  [30, "+ documentos abrir tela sem precisar rolar", "Concluído", "E", "f6bcbb52", "Sticky header + atalho documentos"],
  [31, "Falha no upload de exames/documentos", "Em teste", "A/G/J", "49a097f8", "HEIC, FILE_TOO_LARGE, credentials — validar Denise"],
  [32, "Carregar foto do paciente automaticamente", "Concluído", "D", "2780bf34", "Avatar da conta vinculada na ficha"],
  [33, "Dados da receita mais próximos do nome do médico", "Concluído", "D", "2780bf34", "Layout PDF receita ajustado"],
  [34, "Clicar em Todos os exames / PDF desloga", "Em teste", "A/G/H", "5c558eef", "openAuthenticatedPdf + proxy — validar Denise"],
  [35, "IA em exames compartilhados anexados depois", "Em teste", "I", "906a636f", "Fallback sourceDocumentId no ai-summarize"],
  [36, "Impressão não abre arquivo", "Concluído", "C", "21952b52", "fetch autenticado para PDF/impressão"],
  [37, "Tela em branco para prescrição não guiada", "Concluído", "C/J", "13b40280", "Prescrição texto livre + bulk paste device"],
  [38, "Botões separados Resultado vs Pedido de exame", "Concluído", "B", "bdb9666", "EXAM_REQUEST vs EXAM_RESULT"],
  [39, "Trocar de paciente desloga o usuário", "Em teste", "A/G", "7aca939", "Legal gate once-per-session — validar Denise"],
  [40, "Exames compartilhados entrarem automaticamente no prontuário", "Concluído", "D", "2780bf34", "attachSharedDocumentToChart no share"],
  [41, "Folha de rosto padronizada na visualização/impressão de exame", "Concluído", "E", "f6bcbb52", "Capa no PDF clínico de exame"],
  [42, "Fluxo de encaminhamento diferenciado para Psicólogo", "Concluído", "E/F", "f6bcbb52", "ReferralPanel presetSpecialty=psychology"],
  [43, "Encaminhar paciente / solicitar avaliação por outro profissional", "Em teste", "E/J", "13b40280", "Referral + booking link + mensagem paciente"],
  [44, "Menu lateral: Disponibilidade → Agenda", "Concluído", "C", "21952b52", "nav.availability → Agenda"],
  [45, "Remover botão Categorias da barra esquerda", "Concluído", "C", "21952b52", "Removido do sidebar médico/psicólogo"],
  ["—", "Logo branca no login", "Concluído", "pré-A", "764d108", "Fora da planilha original"],
  ["—", "Logo errada na receita PDF", "Concluído", "pré-A", "764d108", "pdf-brand-logo.ts"],
  ["—", "Remover Comparar imagens da ficha", "Concluído", "C", "21952b52", "Pedido WhatsApp Denise"],
  ["—", "Build Railway quebrado", "Concluído", "pré-A", "c855d11", "Fix imports VoiceAssistantShell etc."],
];

const summary = [
  ["Resumo", "Quantidade"],
  ["Concluído", rows.slice(1).filter((r) => r[2] === "Concluído").length],
  ["Em teste", rows.slice(1).filter((r) => r[2] === "Em teste").length],
  ["Bloqueado (config externa)", rows.slice(1).filter((r) => r[2] === "Bloqueado").length],
  ["Pendente", rows.slice(1).filter((r) => r[2] === "Pendente").length],
  ["Total itens planilha (#1–45)", 45],
  ["Atualizado em", "2026-07-10"],
  ["Último deploy", "13b40280 (Fase J)"],
];

const wb = utils.book_new();
const wsItems = utils.aoa_to_sheet(rows);
const wsSummary = utils.aoa_to_sheet(summary);

wsItems["!cols"] = [
  { wch: 5 },
  { wch: 62 },
  { wch: 14 },
  { wch: 10 },
  { wch: 10 },
  { wch: 55 },
];

utils.book_append_sheet(wb, wsItems, "Ajustes");
utils.book_append_sheet(wb, wsSummary, "Resumo");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
writeFileXLSX(wb, outPath);
console.log(`Written: ${outPath}`);
