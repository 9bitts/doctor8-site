# Análise — Fluxo do paciente venezuelano (site AcuraBrasil)

Simulação: venezuelano em Caracas, celular Android básico, internet instável (CGNAT das operadoras), pouca familiaridade digital, possivelmente sem e-mail, buscando consulta gratuita após os terremotos.

Arquivos analisados: `sos-venezuela.html`, `consulta-venezuela.html`, `solicitud-sos-venezuela.html`, `js/sos-venezuela-intake.js`, `js/sos-venezuela-public.js`, `js/consulta-profissionais.js`, `lib/sos-venezuela-intake.js`, `server.js`.

---

## 1. O fluxo atual (como o paciente vive)

1. Entra pelo Google/WhatsApp → `index` ou `/sos-venezuela` (página longa, com estatísticas do terremoto, parceiros, voluntariado)
2. Clica "Iniciar consulta ahora" → `/consulta-venezuela` (página de instruções em 4 passos)
3. Clica de novo "Iniciar consulta" → `/solicitud-sos-venezuela` (formulário com ~12 campos + TCLE + LGPD)
4. Recebe protocolo → precisa **criar conta no Doctor8** (outra plataforma, re-digita nome/e-mail)
5. Entra em "Atención Inmediata" → escolhe profissional → fila → videochamada

São **5+ etapas em 2 plataformas** antes de falar com alguém. Cada transição perde pacientes — especialmente com conexão ruim e baixa alfabetização digital.

---

## 2. Bugs reais que fazem o paciente ver erro

### 2.1 CRÍTICO — Sucesso tratado como erro quando `intakeToken` é null
Em `sos-venezuela-intake.js` (cliente), o sucesso exige `data.intakeToken`:
```js
if (res.ok && data.ok && data.protocolo && data.intakeToken) { ... }
```
Mas o servidor (`lib/sos-venezuela-intake.js`) retorna `intakeToken: null` quando o DB falha e o e-mail foi enviado. Resultado: **a solicitação foi recebida, mas o paciente vê "error" genérico**, reenvia, cai no rate limit (429), e desiste — gerando duplicatas na triagem.

### 2.2 CRÍTICO — Honeypot + autofill = loop de erro invisível
Navegadores com autofill agressivo podem preencher o campo oculto `website`. O servidor descarta silenciosamente (`{ok:true}` sem protocolo), o cliente cai no erro genérico (sem `data.protocolo`). O paciente **nunca vai conseguir enviar e nunca vai saber por quê**, porque o autofill repete a cada tentativa.

### 2.3 ALTO — Rate limit por IP quebra com CGNAT venezuelano
Operadoras na Venezuela (Movilnet, Digitel, CANTV) usam CGNAT pesado: milhares de usuários compartilham o mesmo IP. O limite de 20s por IP (`RATE_LIMIT_MS`) fará **pacientes diferentes receberem 429** em momentos de pico (exatamente o cenário pós-desastre).

### 2.4 ALTO — Timeout do cliente (18s) vs. conexão lenta
Em rede 2G/3G instável, o `AbortController` cancela aos 18s, mostra "error de conexión" — mas o servidor pode ter processado. O paciente reenvia → duplicata ou 429. Não há deduplicação nem verificação "sua solicitação já foi recebida?".

### 2.5 MÉDIO — Validação nativa do navegador no idioma errado
`form.reportValidity()` mostra mensagens no idioma do navegador/SO, não no idioma do site. Um celular configurado em PT ou EN mostrará mensagens que o paciente não entende, misturadas com o layout em espanhol.

### 2.6 MÉDIO — Se o i18n falhar, o paciente vê chaves cruas
Com `i18n.js` bloqueado/não carregado (conexão ruim, cache corrompido), `t()` devolve a própria chave: o paciente veria `sosve.intake.errorPhone` na tela.

### 2.7 MÉDIO — "Nombre del paciente" obrigatório antes de escolher a relação
No load, `relacion` = "" → `toggleNomePaciente()` mostra o campo e o marca `required`. O paciente que é o próprio paciente vê um campo confuso ("Nombre de quien necesita atención") antes de selecionar qualquer coisa.

### 2.8 MÉDIO — Passo 4 promete lista de profissionais que não existe
Em `/consulta-venezuela`, o botão "Ver profesionales disponibles" leva a `#profissionais`, que hoje só tem um banner dizendo que o atendimento não é no site. `consulta-profissionais.js` (grid, busca, filtro) é **código morto** — nenhuma página o referencia. Expectativa criada e quebrada.

### 2.9 BAIXO — Texto em português na página em espanhol
O banner Doctor8 em `/consulta-venezuela` tem strings default em PT: "Atendimento voluntário AcuraBrasil", "Busque apenas voluntários AcuraBrasil". Para quem só fala espanhol, mina a confiança.

### 2.10 BAIXO — Bloco de horário nunca renderiza na página do formulário
`sos-venezuela-public.js` pula `#sos-schedule-status` quando `isIntakePage` e tenta renderizar `#sos-schedule-info`, que não existe nessa página. O paciente preenche o formulário sem saber se está fora do horário de atendimento.

---

## 3. Contradições que confundem o paciente

- **"Iniciar consulta ahora" / "Atención Inmediata" vs. "triaje: 2 a 24 horas"** — o site promete imediato, o sucesso diz espera de até 24h, e o modelo descrito em `/sos-venezuela` fala em triagem + encaminhamento + agendamento via WhatsApp. O paciente não sabe o que esperar.
- **Emergência aceita no fluxo normal** — se ele marca "Emergencia — riesgo de vida", o formulário aceita e responde "2 a 24 horas". Deveria interceptar imediatamente com orientação 911/hospital.
- **Protocolo só vai para a equipe** — o e-mail do intake vai para `contato@acurabrasil.org`; o paciente **não recebe nada** (nem e-mail, nem WhatsApp). Se fechar a aba, perde o protocolo `SOS-VE-20260713-XXXXXXXXXX` (sufixo de 10 caracteres, difícil de anotar).

---

## 4. Barreiras de fricção (não são bugs, mas afastam o paciente)

1. **Telefone em 3 campos com conceito brasileiro ("DDI/DDD")** — a Venezuela não usa "DDD"; usa código de operadora (0412, 0414, 0416, 0424, 0426). Um venezuelano vai digitar `0414` com zero, ou colar o número completo num campo só. Melhor: campo único "WhatsApp" com +58 pré-fixado e parse automático.
2. **E-mail obrigatório 2 vezes** (formulário + conta Doctor8) — parte da população-alvo não tem e-mail ativo. O caminho WhatsApp existe, mas é apresentado como socorro secundário, não como via principal alternativa.
3. **Dois checkboxes de consentimento + TCLE escondido em `<details>`** — juridicamente ok, mas poderiam ser um bloco único com resumo em linguagem simples.
4. **Sem `autocomplete`** (`name`, `email`, `tel`) nos campos reais — dificulta preenchimento no celular (e o único `autocomplete` presente, ironicamente, está no honeypot).
5. **Sem rascunho persistente** — falha de rede depois de escrever os sintomas = perde tudo.
6. **Nada é pré-preenchido no Doctor8** — o paciente re-digita nome/e-mail que acabou de informar. Se o Doctor8 suportar query params ou API de pré-registro, é a maior economia de fricção do funil.
7. **Página de intake pesada e cheia de distrações** — nav completa, newsletter, doação, rodapé enorme. Para conexão 2G, um layout mínimo focado no formulário carrega mais rápido e converte mais.
8. **Ubicación em texto livre** — um `<select>` com os 24 estados + campo cidade padroniza a triagem.

---

## 5. Recomendações priorizadas

**P0 — Corrigir perda silenciosa de pacientes**
1. Cliente aceitar sucesso sem `intakeToken` (bug 2.1).
2. Trocar honeypot por técnica resistente a autofill (campo com nome não-semântico + verificação de tempo de preenchimento) e, no mínimo, logar quando o honeypot descarta (bug 2.2).
3. Rate limit: chavear por e-mail/telefone (hash) além de IP, ou aumentar janela de tolerância por IP (bug 2.3).
4. Idempotência no intake: aceitar um `client_request_id` (UUID gerado no cliente) para reenvios não criarem duplicatas; no timeout, reenviar com o mesmo ID (bug 2.4).
5. Enviar confirmação ao paciente (e-mail com protocolo + link wa.me pré-preenchido com o protocolo).

**P1 — Reduzir fricção do formulário**
6. Campo único de WhatsApp com +58 fixo e parse (aceitar 0414..., 414..., +58414...).
7. Validação inline em espanhol (substituir `reportValidity` por mensagens próprias via i18n).
8. `autocomplete` correto em todos os campos; `inputmode` já ok.
9. Esconder "Nombre del paciente" até a relação ser escolhida; interceptar "Emergencia" com aviso 911 antes do envio.
10. Rascunho automático em `localStorage`.
11. Select de estados da Venezuela.
12. Fallbacks de texto embutidos para mensagens de status (não depender do i18n carregar).

**P2 — Encurtar a jornada**
13. Levar o CTA principal do index direto ao formulário (pular `/consulta-venezuela` como etapa obrigatória; mantê-la como "como funciona").
14. Alinhar expectativa: um único texto sobre tempo ("imediato quando houver profissional online; senão, triagem em até 24h") repetido em hero, formulário e sucesso; mostrar o bloco de horário/plantão na própria página do formulário (bug 2.10).
15. Pré-preencher registro Doctor8 (query params/API) ou, ideal, criar a conta a partir do intake com convite por WhatsApp/e-mail.
16. Remover o botão "Ver profesionales disponibles" ou reativar a lista real; remover `consulta-profissionais.js` morto; corrigir strings PT na página ES.
17. Versão "lite" da página de intake (sem nav completa/newsletter) para conexões lentas.
18. Elevar o WhatsApp a caminho de primeira classe: "¿Prefiere WhatsApp? Envíe su solicitud completa por WhatsApp" com mensagem pré-formatada contendo os campos essenciais.

---

## 6. Prompts prontos para o Cursor

### Prompt 1 — Bugs P0 do intake (fazer primeiro)
```
No projeto acurabrasil, corrija os seguintes bugs do fluxo de intake SOS Venezuela sem alterar o design:

1. public/js/sos-venezuela-intake.js: o tratamento de sucesso exige `data.intakeToken`,
   mas o servidor pode retornar intakeToken null (quando o DB falha e o e-mail é enviado).
   Trate como sucesso quando `res.ok && data.ok && data.protocolo`; se intakeToken for null,
   apenas desative o tracking de eventos (trackIntakeEvent já ignora sem token).

2. Honeypot: navegadores com autofill podem preencher o campo oculto #website, fazendo o
   servidor descartar silenciosamente ({ok:true} sem protocolo) e o cliente mostrar erro
   genérico em loop. Em lib/sos-venezuela-intake.js, além do honeypot, adicione verificação
   de tempo mínimo de preenchimento (campo hidden com timestamp de render, rejeitar < 3s).
   No cliente, limpe o honeypot antes do submit (form.querySelector('#website').value = '').
   Logue no servidor sempre que o honeypot descartar uma submissão.

3. Rate limit (lib/sos-venezuela-intake.js): usuários venezuelanos compartilham IP via CGNAT.
   Troque a chave do rate limit de IP puro para hash(IP + email normalizado). Mantenha um
   limite global por IP mais frouxo (ex.: 10 envios/minuto) como proteção contra abuso.

4. Idempotência: no cliente, gere um client_request_id (crypto.randomUUID()) por tentativa
   de preenchimento e reenvie o MESMO id em retries. No servidor, se um intake com o mesmo
   client_request_id já existir (janela de 1h), retorne o protocolo existente em vez de
   criar duplicata. Persistir o id no sos-intake-store.

Escreva/atualize testes para os 4 casos. Não mude nenhum texto visível.
```

### Prompt 2 — Confirmação ao paciente + emergência
```
No projeto acurabrasil, fluxo SOS Venezuela:

1. Após intake válido (lib/sos-venezuela-intake.js), envie também um e-mail de confirmação
   AO PACIENTE (data.email) em espanhol: protocolo, o que acontece agora (triagem em até 24h,
   ou atendimento imediato se houver profissional online), link para criar conta no Doctor8
   e link wa.me de ajuda com o protocolo pré-preenchido. Reutilize a infra Resend/SMTP
   existente; falha nesse e-mail não pode falhar o intake (fire-and-forget com log).

2. No formulário (public/solicitud-sos-venezuela.html + sos-venezuela-intake.js), quando o
   usuário selecionar prioridad = "emergencia", exiba imediatamente (antes do envio) um
   aviso destacado em espanhol: em risco de vida, ligar 911 (VEN-911) ou ir ao hospital mais
   próximo; a teleconsulta não substitui emergência presencial. Permita continuar o envio
   após o aviso. Adicione as strings novas em i18n-es.js e i18n-pt.js.

3. Na tela de sucesso, adicione botão "Copiar protocolo" (navigator.clipboard com fallback)
   e um link wa.me "Enviarme mi protocolo por WhatsApp" com o protocolo no texto.
```

### Prompt 3 — Fricção do formulário
```
No formulário public/solicitud-sos-venezuela.html (+ js/sos-venezuela-intake.js,
lib/sos-venezuela-intake.js, i18n-es.js, i18n-pt.js):

1. Substitua os 3 campos de telefone (DDI/DDD/número) por UM campo "WhatsApp" com prefixo
   +58 visível e fixo. Parse no cliente e no servidor aceitando: "04141234567",
   "4141234567", "+584141234567", "0414 123 45 67" (remover não-dígitos, remover 0 inicial,
   remover 58 duplicado). Manter compatibilidade do payload (ddi/ddd/telefone) derivando os
   campos no cliente. Venezuela não usa o conceito brasileiro de DDD — não usar essa palavra.

2. Adicione autocomplete="name" (nome), autocomplete="email", autocomplete="tel" e
   autocomplete="off" nos campos de saúde (sintomas/observaciones).

3. Esconda o grupo "Nombre del paciente" enquanto relacion === "" (hoje aparece antes da
   seleção).

4. Substitua form.reportValidity() por validação inline própria: mensagens em espanhol/pt
   via i18n abaixo de cada campo, foco no primeiro inválido. Adicione fallback de texto
   embutido caso o i18n não tenha carregado (nunca exibir chaves cruas tipo
   "sosve.intake.errorPhone").

5. Rascunho automático: salve os valores do formulário em localStorage (exceto consentimentos)
   com debounce; restaure ao carregar; limpe após sucesso.

6. Troque "Ciudad y estado" por um <select> com os 24 estados da Venezuela + Distrito Capital
   e um campo texto "Ciudad".
```

### Prompt 4 — Jornada e consistência
```
No projeto acurabrasil, páginas do fluxo Venezuela:

1. Unifique a mensagem de expectativa de tempo em i18n (es/pt): "Si hay profesionales en
   línea, la atención puede ser inmediata; si no, nuestro equipo de triaje responde en hasta
   24 horas." Use nas 3 superfícies: hero de /consulta-venezuela, formulário e tela de
   sucesso. Remova promessas conflitantes ("ahora" vs "2 a 24 horas").

2. Em public/js/sos-venezuela-public.js: na página de intake o bloco de horário nunca
   renderiza (renderiza #sos-schedule-info, que não existe lá, e pula #sos-schedule-status).
   Corrija para renderizar o status de plantão em #sos-schedule-status também na página de
   intake, acima do formulário.

3. Em /consulta-venezuela: o passo 4 "Ver profesionales disponibles" aponta para
   #profissionais, que não lista profissionais. Remova o botão/passo ou aponte para o banner
   Doctor8 com texto honesto. Remova public/js/consulta-profissionais.js se nenhuma página o
   referencia (confirmar antes com grep).

4. Corrija strings em português exibidas na versão em espanhol do banner Doctor8
   ("Atendimento voluntário AcuraBrasil", "Busque apenas voluntários AcuraBrasil") — mover
   para i18n com tradução es.

5. No index e em /sos-venezuela, faça o CTA principal do paciente apontar direto para
   /solicitud-sos-venezuela (a página /consulta-venezuela vira link secundário "¿Cómo
   funciona?").
```

### Prompt 5 — WhatsApp como via principal alternativa (estratégico)
```
No projeto acurabrasil: eleve o WhatsApp a caminho completo de solicitação para pacientes
sem e-mail ou com conexão precária.

1. Em /solicitud-sos-venezuela e /consulta-venezuela, adicione um cartão no topo:
   "¿Sin correo electrónico o con internet lenta? Solicite por WhatsApp" com link wa.me cujo
   texto pré-formatado já contenha o mini-formulário: "Nombre: / Ciudad: / Tipo de atención
   (médica/psicológica): / Síntomas: ". Assim o voluntário recebe os dados essenciais na
   primeira mensagem.

2. Documente em comentário que o time de triagem registra manualmente esses casos no admin.

3. Strings novas em i18n-es.js e i18n-pt.js.
```

---

## 7. Verificação feita

- Bug 2.1 confirmado por leitura cruzada: cliente linha 173 (`&& data.intakeToken`) × servidor linhas 371–405 (retorna `intakeToken: null` com status 200).
- Bug 2.8 confirmado: `grep -rl consulta-profissionais.js public/*.html` → nenhum resultado (código morto).
- Ausência de `autocomplete` nos campos reais confirmada por grep (só existe no honeypot).
- Bug 2.10 confirmado: `init()` em `sos-venezuela-public.js` pula `sos-schedule-status` quando `isIntakePage` e `sos-schedule-info` não existe na página de intake.
