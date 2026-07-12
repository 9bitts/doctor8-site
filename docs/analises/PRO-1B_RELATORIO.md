# PRO-1B - Relatorio

**Schema mudou? NAO** | **Commit/push:** nao realizado (Diego verifica)

---

## Item 1 - Heartbeat JIT na videoconsulta (sem componentes congelados)

**Como resolvido:** `src/app/video/jit/[queueId]/page.tsx` monta `<JitSessionHeartbeat enabled={...} />` quando `fetchSession` detecta `role === "professional"` na resposta de `/api/jit/queue/[queueId]/video`. Paciente: heartbeat desligado.

**Consulta agendada (`/video/[id]`):** `useConsultSessionKeepalive` dentro de `VideoConsultRoom` (congelado) ja mantem a sessao NextAuth durante a consulta; **nao** cobre o status ONLINE do plantao JIT - escopo JIT apenas.

| Arquivo | Linhas |
|---------|--------|
| `src/app/video/jit/[queueId]/page.tsx` | 1-130 |
| `src/components/professional/JitSessionHeartbeat.tsx` | 1-34 |
| `src/app/api/jit/queue/[queueId]/video/route.ts` | +backHref, providerPanel |

---

## Item 2 - Fallback role-aware no erro de video

`setVideoNavContext()` grava role/backHref em sessionStorage nas paginas `video/jit` e `video/[id]`. `videoBackFallback()` le isso - profissional JIT -> `/professional/jit` (ou painel psicologo via backHref da API); paciente -> `/urgent`. VideoConsultRoom nao foi alterado.

| Arquivo | Linhas |
|---------|--------|
| `src/lib/safe-nav.ts` | 1-70 |
| `src/app/video/jit/[queueId]/page.tsx` | fetchSession |
| `src/app/video/[id]/page.tsx` | fetchSession |

---

## Item 3 - No-show server-side

`expireStaleJitNoShows()` em GET queue (mine/queueId), GET video, PATCH EXPIRE_NOSHOWS, cron jit-cleanup. Refunds idempotentes preservados.

| Arquivo | Linhas |
|---------|--------|
| `src/lib/jit-no-show-expiry.ts` | novo |
| `src/app/api/jit/queue/route.ts` | GET + EXPIRE_NOSHOWS |
| `src/app/api/jit/queue/[queueId]/video/route.ts` | lazy expire |
| `src/app/api/cron/jit-cleanup/route.ts` | +expiredNoShows |

---

## Item 4 - 409 ALREADY_CALLING amigavel

UI mapeia ALREADY_CALLING -> `jit.alreadyCalling` + refresh silencioso da fila.

| Arquivo | Linhas |
|---------|--------|
| `src/app/(dashboard)/professional/jit/page.tsx` | callNext |

---

## Item 5 - Guard CALL_NEXT + PAUSED

API: SESSION_NOT_ONLINE se status != ONLINE; IN_PROGRESS_ACTIVE (409) sem confirmEndInProgress; UI com painel de confirmacao.

| Arquivo | Linhas |
|---------|--------|
| `src/app/api/jit/queue/route.ts` | CALL_NEXT |
| `src/app/(dashboard)/professional/jit/page.tsx` | confirmEndOpen |

---

## Item 6 - Daily falhou = sem notificacao

503 VIDEO_ROOM_FAILED; entrada permanece WAITING; paciente nao notificado.

| Arquivo | Linhas |
|---------|--------|
| `src/app/api/jit/queue/route.ts` | CALL_NEXT Daily block |

---

## Item 7 - Lacuna sem fallback silencioso

SIGNED + falha S3 -> 503 SIGNED_PDF_UNAVAILABLE. UI: PdfDownloadButton + toast.

| Arquivo | Linhas |
|---------|--------|
| `src/app/api/professional/prescriptions/[id]/pdf/route.ts` | 113-128 |
| `src/app/api/professional/documents/[id]/pdf/route.ts` | 105-118 |
| `src/app/(dashboard)/professional/prescriptions/page.tsx` | PdfDownloadButton |

---

## Item 8 - Feedback hub prescricoes

Banner sign=processing, badge PENDING, bloqueio re-assinar, toasts deliver, pref WhatsApp via sessionStorage, erros Lacuna mapeados.

| Arquivo | Linhas |
|---------|--------|
| `src/app/(dashboard)/professional/prescriptions/page.tsx` | hub |
| `src/components/professional/emissions/EmissionPostSaveFlow.tsx` | pref |
| `src/components/professional/emissions/EmissionsSignModal.tsx` | codes |
| `src/app/api/professional/prescriptions/sign/route.ts` | parseLacunaError |
| `src/lib/lacuna-errors.ts` | novo |

---

## Chaves i18n (PT / EN / ES)

jit.alreadyCalling, jit.confirmEndInProgress, jit.confirmEndContinue, jit.videoRoomFailed, jit.sessionNotOnline, jit.inProgressActive, rx.signProcessing, rx.signPending, rx.signedPdfUnavailable, rx.pdfDownloadError, rx.flow.deliverSuccess, digSign.errQuota, digSign.errCpf, digSign.errCertificate

---

## CLASSES TAILWIND NOVAS

Nenhuma.

---

## Zona congelada

Intocada: humanitario, VideoConsultRoom.tsx, DailyPrebuiltEmbed.tsx, dispatcher.

---

## TypeScript

```
npx prisma generate  -> OK (Prisma Client v5.22.0)
npx tsc --noEmit     -> exit 0
```
