# Análise de UX — Doctor8

**Data:** 11 de julho de 2026
**Método:** leitura de código-fonte real (~85 arquivos: páginas, componentes, formulários, traduções) em todos os grandes públicos do sistema — paciente, profissional (8 portais de especialidade), organização/empresa, admin, farmácia, laboratório, e fluxos humanitários/públicos. Nenhum arquivo foi alterado.
**Objetivo:** identificar o que impede um usuário de aprender a usar o Doctor8 sozinho, sem suporte, e transformar isso em ações concretas para execução no Cursor.

Este documento tem duas partes: (1) o diagnóstico, organizado por tema transversal e depois por público; (2) uma lista de prompts prontos para colar no Cursor, um por problema, já priorizados.

---

## Parte 1 — Diagnóstico

### 1.1 O padrão geral: o produto cresceu rápido e cada módulo "reaprendeu a roda"

O achado mais importante não é uma tela específica — é estrutural. O Doctor8 tem oito portais de profissional (`professional`, `psychologist`, `psychoanalyst`, `integrative-therapist`, `nutricionista`, `odontologo`, `enfermeiro`, `farmaceutico`) e três portais organizacionais (`empresas`, `farmacias`, `laboratorios`) que deveriam ter a mesma "gramática visual", mas foram construídos com graus de acabamento muito diferentes. Isso tem um custo direto de aprendizado: um usuário que aprende a usar um módulo não consegue transferir esse conhecimento para outro, porque os padrões de botão, mensagem de vazio, confirmação e feedback mudam a cada tela. Um sistema intuitivo depende de consistência — é o que permite a alguém "adivinhar certo" como algo vai se comportar antes de tentar.

Isso aparece de forma concreta em quatro camadas, da mais grave para a mais cosmética:

1. **Bug funcional disfarçado de inconsistência visual**: em 5 dos 8 dashboards de profissional (`psychologist`, `farmaceutico`, `nutricionista`, `odontologo`, `enfermeiro`), o nome do paciente é exibido sem descriptografar — ou seja, o profissional literalmente vê texto cifrado ilegível no lugar do nome. Isso não é um problema de "clareza de texto", é um defeito que quebra a confiança no produto na primeira tela que o profissional vê.
2. **Recursos de onboarding construídos e nunca conectados**: existem componentes prontos (`ProfessionalTourWrapper`, `ProfessionalChecklistWrapper`, `PsychologistTourWrapper`) que fazem exatamente o que este relatório recomendaria — um tour guiado de primeiro uso — mas nenhuma página realmente os importa. O paciente tem essa experiência (`PatientTourWrapper` está de fato em uso); o profissional não. É a evidência mais clara de que o objetivo do usuário aprender sozinho já foi perseguido pela equipe, só não foi finalizado/reconectado em todos os públicos.
3. **Duplicação de formulários clínicos com profundidade desigual**: prescrição no `professional`/`odontologo` tem checagem de interação medicamentosa e classificação de receita controlada; a mesma tarefa em `enfermeiro`/`farmaceutico` é um formulário de texto livre sem nenhuma validação. Além do problema de aprendizado, isso é um risco clínico.
4. **Estados vazios e feedback de sucesso tratados de forma diferente em cada tela**: o padrão bom existe (`EmptyState` com ícone + texto + botão de ação, usado no dashboard do paciente e do `professional`) mas não foi propagado para o resto do sistema. A maioria das telas administrativas (RH, ledger, farmácias, admin) simplesmente não avisa quando uma ação deu certo.

### 1.2 Jargão técnico vazando para quem não deveria vê-lo

Encontramos repetidamente conteúdo destinado a desenvolvedores/administradores aparecendo na tela de usuários finais leigos:

- Instruções de configuração da AWS/Twilio ("cadastre este número em AWS Console → SNS...") aparecendo como mensagem de erro para o **paciente** na verificação por SMS. Isso trava completamente o autoatendimento.
- Uma seção inteira de "FHIR interoperability" / "SMART configuration" exposta no formulário de histórico médico do paciente comum.
- Ações de auditoria mostradas em `SCREAMING_SNAKE_CASE` (`CREATE_RECORD`, `EXPORT_DATA`) para o admin, sem tradução para linguagem natural.
- Siglas nunca explicadas para o público que mais precisa: "EAP" na tela do colaborador de empresa (público leigo por definição), "TCLE" no fluxo humanitário para venezuelanos, "CDC" na política de cancelamento em português (as versões em inglês/espanhol foram adaptadas, a portuguesa não), "PGR/NR-1" no canal de denúncia, "Grau de risco/SST" no cadastro de empresa.

### 1.3 Onboarding: existe para o paciente, não existe (de fato) para mais ninguém

`src/app/onboarding/page.tsx` é hoje apenas um redirecionamento — o próprio comentário no código admite que a tela de onboarding anterior estava quebrada e foi substituída por "manda direto para a tela de completar perfil". Isso significa que todo usuário novo (seja paciente, profissional, RH de empresa, farmacêutico) cai direto num formulário de dados, sem nenhuma introdução ao produto, sem explicação do que fazer primeiro. O paciente tem parcialmente um paliativo (`PatientChecklist`, `PatientTour`), mas mesmo esse só aparece depois que o usuário já está dentro do dashboard — não há boas-vindas no primeiro instante.

### 1.4 Formulários longos sem divisão em etapas

O formulário de histórico médico do paciente (13 seções, ~500 linhas de código, tudo em uma única página) e a anamnese nutricional (17 campos sem agrupamento visual) são os piores exemplos. Não há wizard, não há barra de progresso, não há indicação de "isso é opcional". O melhor contra-exemplo do próprio sistema é a tela de TCLE do paciente — curta, um objetivo só, resumo em linguagem simples — que deveria servir de modelo para as demais.

### 1.5 Ações irreversíveis sem confirmação adequada

Dois casos de risco real, não apenas incômodo:
- Farmacêutico dispensa uma receita clicando um botão só, sem confirmação e **sem ver a data de validade da receita na tela** (o campo existe no código, só não é exibido).
- Admin altera taxa de plataforma cobrada de farmácias/laboratórios parceiros sem nenhuma confirmação nem mensagem de sucesso.
- Várias ações críticas do fluxo humanitário (sair da fila, sair da videochamada) usam `window.confirm()` nativo do navegador — inconsistente visualmente e potencialmente ilegível em dispositivos antigos, justamente o hardware mais comum nesse público.

### 1.6 O público mais vulnerável tem a rede de segurança mais fraca

O fluxo humanitário (SOS Venezuela) atende pessoas em urgência médica real, muitas vezes em pânico, com conexão instável e dispositivos antigos. Encontramos:
- Cadastro completo de conta como primeiro passo obrigatório, antes de qualquer contato — maior risco de abandono do sistema inteiro.
- Pré-checagem de câmera/microfone (que existe e funciona bem no fluxo `jit` de plantão) **não foi reaproveitada** no fluxo humanitário — o público que mais precisa dessa rede de segurança é o único sem ela.
- Quando não há voluntários online, a tela apenas avisa isso, sem alternativa de ação (nenhuma notificação "avise-me quando alguém entrar", nenhum reforço visível do contato de emergência local).
- É, ao mesmo tempo, a área com **melhor tradução** do produto (pt/en/es completos, com atenção real a priorizar espanhol) — mostra que a equipe já tem o hábito certo, só não foi replicado com a mesma prioridade nos aspectos acima.

### 1.7 Pontos positivos a preservar e replicar (não é só lista de problemas)

Vale destacar o que já funciona bem, porque são os modelos a copiar para o resto do sistema:
- Dashboard do paciente: banner único de prioridade (não bombardeia com vários avisos ao mesmo tempo), rodapé de privacidade sempre visível, `EmptyState` com ação clara.
- Tela de TCLE: formulário curto, foco único, linguagem simples.
- Tela "Esqueci minha senha": confirmação clara após envio, dica de verificar spam.
- Stepper visual do fluxo humanitário (`HumanitarianFlowStepper`) e a tela de fila, que mostra posição e tempo estimado — reduz ansiedade de espera de forma muito eficaz.
- Tela de rateio financeiro do admin: é a mais cuidada do painel administrativo (confirmação antes de ação irreversível, alerta de valor alto) — modelo a replicar nas outras telas financeiras/administrativas.
- Pré-checagem de câmera/microfone do fluxo `jit` — ótima prática, só precisa ser estendida.

---

## Parte 2 — Prompts prontos para o Cursor

Cada prompt abaixo é autocontido: pode ser colado diretamente no Cursor. Estão ordenados por prioridade (impacto vs. esforço). Os 5 primeiros são bugs/riscos que vão além de "polimento de UX" — recomendo tratá-los antes dos demais.

### 🔴 Prioridade crítica

**1. Corrigir nomes de pacientes exibidos como texto cifrado**
```
No painel do profissional, o widget de "próximos atendimentos" mostra o nome do
paciente sem descriptografar em 5 portais: src/app/(dashboard)/psychologist/page.tsx,
farmaceutico/page.tsx, nutricionista/page.tsx, odontologo/page.tsx e enfermeiro/page.tsx.
O campo PatientProfile.firstName/lastName é PHI criptografado (ver prisma/schema.prisma).
Em src/app/(dashboard)/professional/page.tsx e psychoanalyst/page.tsx o código já usa
safeDecrypt(apt.patient.firstName) corretamente antes de renderizar — use esse padrão
como referência. Aplique safeDecrypt (ou a função equivalente já usada no projeto) aos
nomes de paciente nos 5 arquivos listados, para que o nome apareça legível em vez de
texto cifrado. Não altere a lógica de busca de dados, apenas a exibição.
```

**2. Reconectar o tour/checklist de onboarding do profissional**
```
Existem componentes prontos de tour guiado e checklist de primeiro uso para
profissionais: src/app/(dashboard)/professional/ProfessionalChecklistWrapper.tsx,
ProfessionalTourWrapper.tsx, e src/app/(dashboard)/psychologist/PsychologistTourWrapper.tsx.
Nenhum deles é importado por nenhuma página atualmente (confirmar com busca por
"TourWrapper|ChecklistWrapper" no projeto). Compare com o paciente, que usa
PatientChecklistWrapper/PatientTourWrapper dentro de
src/app/(dashboard)/patient/page.tsx — use esse uso como modelo.
Reative ProfessionalTourWrapper e ProfessionalChecklistWrapper dentro de
src/app/(dashboard)/professional/page.tsx, e replique o padrão (tour + checklist)
para os demais portais de especialidade (psychologist, psychoanalyst,
integrative-therapist, nutricionista, odontologo, enfermeiro, farmaceutico),
adaptando o conteúdo do tour para as tarefas específicas de cada especialidade
(configurar disponibilidade, completar credenciais/licença, fazer o primeiro
atendimento).
```

**3. Adicionar confirmação e exibir validade da receita antes de dispensar na farmácia**
```
Em src/components/pharmacy-store/PharmacyValidateClient.tsx, o botão "Confirmar
dispensação (CRF)" (perto da linha 130) executa a dispensação imediatamente ao
clicar, sem diálogo de confirmação, e o campo validUntil (validade da receita,
já presente no tipo de dados por volta da linha 15) nunca é exibido na tela.
Faça duas mudanças: (1) exiba a data de validade da receita de forma destacada
perto das informações da receita, com aviso visual se estiver vencida; (2) adicione
um diálogo de confirmação (reutilizando o componente de dialog já usado em outras
partes do projeto, não window.confirm) antes de executar a dispensação, mostrando
um resumo do que será confirmado.
```

**4. Remover mensagens técnicas de infraestrutura (AWS/Twilio) das telas do paciente**
```
Em src/lib/i18n/translations.ts, as chaves verifySms.error.trialUnverified,
.geoBlocked, .fraudBlocked, .snsSandbox e .snsQuota (por volta das linhas
4858-4862 em inglês e 10481-10485 em português) contêm instruções de configuração
de console AWS/Twilio destinadas a desenvolvedores, mas são exibidas como mensagem
de erro para o paciente na tela de verificação por SMS
(src/app/(auth)/verify-sms/page.tsx). Troque o texto voltado ao usuário final por
uma mensagem genérica e acionável, por exemplo: "Não foi possível enviar o SMS
agora. Tente novamente em alguns minutos ou verifique seu e-mail para continuar."
O texto técnico detalhado deve ser movido para um log de erro (console.error ou
serviço de observability já usado no projeto), nunca renderizado na tela do usuário.
Aplique a mesma revisão a qualquer outra mensagem de erro do fluxo de autenticação
que exponha nomes de provedores técnicos (Twilio, AWS SNS) ou instruções de console.
```

**5. Ativar pré-checagem de câmera/microfone no fluxo humanitário de vídeo**
```
O fluxo de plantão em src/app/video/jit/[queueId]/page.tsx (por volta das linhas
115-215) já tem uma tela "Pronto para entrar" com teste de câmera/microfone e
mensagens de erro específicas (permissão negada, dispositivo não encontrado) em
múltiplos idiomas. Essa mesma pré-checagem não existe em
src/app/video/humanitarian/[entryId]/page.tsx, que vai direto para o componente
VideoConsultRoom. Extraia a lógica de pré-checagem de mídia do fluxo jit para um
componente reutilizável (ex: MediaPreCheck) e use-o também em
video/humanitarian/[entryId]/page.tsx antes de entrar na sala, mantendo a mesma
qualidade de mensagens de erro multi-idioma (o fluxo humanitário já tem suporte a
es/pt/en, reaproveite essas traduções).
```

### 🟠 Prioridade alta

**6. Dividir o formulário de histórico médico do paciente em etapas**
```
O arquivo src/app/(dashboard)/patient/history/page.tsx (cerca de 500 linhas)
renderiza 13 seções do histórico médico (identificação, motivo, antecedentes,
hábitos de vida, revisão de sistemas, histórico ginecológico, imunizações,
substâncias, doenças infecciosas, notas) todas de uma vez em uma única página
longa, sem indicação de progresso. Refatore para um wizard de múltiplas etapas
com: (a) barra de progresso indicando "Etapa X de Y"; (b) navegação entre etapas
(voltar/avançar) sem perder dados já preenchidos; (c) um indicador visual "opcional"
em cada seção que não seja obrigatória, reforçando o texto que já existe
("apenas a primeira pergunta é obrigatória") de forma mais visível que texto
pequeno no topo da página; (d) salvar automaticamente o progresso a cada etapa
concluída, para que o paciente possa sair e voltar depois sem perder o que já
preencheu. Não altere os campos nem a lógica de submissão, apenas a divisão e
navegação visual.
```

**7. Remover a seção técnica FHIR/SMART da tela de histórico do paciente**
```
Em src/app/(dashboard)/patient/history/page.tsx (por volta das linhas 426-442),
há uma seção "FHIR interoperability" com botões para "SMART configuration" e
"FHIR server metadata" apontando para endpoints técnicos
(/.well-known/smart-configuration, /fhir/metadata). Esses links são relevantes
apenas para integrações de terceiros/desenvolvedores, não para o paciente comum.
Remova essa seção da tela do paciente. Se a informação precisa ficar acessível
para fins de compliance/interoperabilidade, mova-a para uma página de
"Configurações avançadas" ou documentação técnica separada, fora do fluxo
principal do paciente.
```

**8. Padronizar componente de estado vazio (EmptyState) em todo o sistema**
```
O componente EmptyState (ícone + mensagem + botão de ação) já é usado com bons
resultados em src/app/(dashboard)/patient/page.tsx e
src/app/(dashboard)/professional/page.tsx. As mesmas situações de "nenhum
registro" aparecem sem ação sugerida em vários outros lugares: proappt.empty em
psychologist/page.tsx e psychoanalyst/page.tsx, pharma.dashboard.noAppointments
em farmaceutico/page.tsx, e as listas vazias de organization/hr/page.tsx,
organization/ledger/page.tsx e organization/patients (verificar arquivo exato).
Substitua as mensagens de texto simples nesses locais pelo componente EmptyState
já existente, incluindo um botão de ação relevante ao contexto (ex: "Configurar
disponibilidade" quando não há consultas agendadas, "Adicionar profissional"
quando a organização não tem profissionais vinculados).
```

**9. Unificar o comportamento de fallback de CNPJ nos cadastros de empresas/farmácias/laboratórios**
```
Em src/app/empresas/cadastro/page.tsx (por volta das linhas 66-91), quando a
consulta de CNPJ falha, o fluxo mostra um erro e oferece um botão explícito
"Continuar com preenchimento manual". Em src/app/farmacias/cadastro/page.tsx
(linhas 66-73) e src/app/laboratorios/cadastro/page.tsx, o mesmo tipo de falha
avança automaticamente para o passo 2 sem pedir confirmação nenhuma ao usuário.
Padronize os três fluxos para usar o mesmo comportamento — recomendo o padrão
de empresas/cadastro (erro visível + botão explícito de continuar manualmente),
por ser mais transparente sobre o que está acontecendo.
```

**10. Unificar o padrão de aceite de termos (checkbox único vs. três checkboxes)**
```
src/app/empresas/cadastro/page.tsx (linhas 351-364) usa três checkboxes
separados para termos, privacidade e LGPD. src/app/farmacias/cadastro/page.tsx
(linhas 325-338) e src/app/empresas/equipe/cadastro/page.tsx (linha 145) usam um
único checkbox que marca as três flags internamente. Escolha um padrão único
(recomendo um único checkbox com os três links de documento no texto, por ser
mais simples de usar) e aplique de forma consistente em todos os formulários de
cadastro que exigem esse tipo de consentimento (empresas, farmácias,
laboratórios, equipe).
```

**11. Adicionar feedback de sucesso em ações administrativas silenciosas**
```
As seguintes ações fazem PATCH/POST e recarregam a lista sem nenhuma mensagem de
confirmação visível ao usuário: cadastro de colaborador e lançamento de folha em
src/app/(dashboard)/organization/hr/page.tsx (linhas ~81-93 e ~111-121),
atualização de dados da organização em
src/app/(dashboard)/organization/settings/page.tsx, e edição de taxa de
plataforma em src/app/(dashboard)/admin/farmacias/AdminPharmacyStoresClient.tsx
e AdminLaboratoriesClient.tsx (função saveFee, linhas ~182-199). Adicione um
toast de confirmação de sucesso (usando o sistema de toast já existente no
projeto) após cada uma dessas ações, e um toast de erro específico caso a
requisição falhe.
```

**12. Adicionar busca e paginação nos painéis admin de farmácias, laboratórios e pagamentos**
```
src/app/(dashboard)/admin/farmacias/AdminPharmacyStoresClient.tsx,
AdminLaboratoriesClient.tsx e
src/app/(dashboard)/admin/payments/PaymentsAdminClient.tsx carregam a lista
completa de registros de uma vez, com filtro apenas por status (farmácias/
laboratórios) ou nenhum filtro (pagamentos, linha ~68). Adicione: (a) campo de
busca textual (por nome/CNPJ nas farmácias e laboratórios; por paciente/status
nos pagamentos); (b) paginação ou carregamento incremental; (c) no caso de
pagamentos, filtro por período de data. Use os componentes de busca/paginação já
padronizados em outras telas do admin, se existirem (verificar
admin/users/AdminUsersClient.tsx como possível referência de busca).
```

**13. Substituir window.confirm/alert por diálogos internos no fluxo humanitário e em pagamentos**
```
Os seguintes pontos usam window.confirm()/alert() nativos do navegador:
src/components/VideoConsultRoom.tsx (linhas ~692-701, leaveConfirm),
src/app/humanitarian/[slug]/page.tsx (linha ~326 leaveQueue, linha ~288
switchPool), e src/app/(dashboard)/admin/payments/PaymentsAdminClient.tsx
(linhas ~49-63, ação de reembolso). Substitua todos por um componente de diálogo
de confirmação já usado no design system do projeto (verificar se há um
componente Dialog/AlertDialog do Radix já padronizado em outras partes, como em
admin/rateio), garantindo que o texto apareça no idioma correto (o fluxo
humanitário precisa suportar es/pt/en) e com estilo visual consistente com o
resto da tela.
```

### 🟡 Prioridade média

**14. Explicar siglas e jargão técnico para o público leigo**
```
Substitua ou complemente as seguintes siglas/termos técnicos que aparecem sem
explicação para públicos leigos: "EAP" em src/app/empresas/colaborador/page.tsx
(linhas ~77, 116-120) — trocar o rótulo principal para algo como "Apoio
psicológico oferecido pela sua empresa (EAP)"; "TCLE" no fluxo humanitário
(src/app/humanitarian/[slug]/page.tsx e traduções hum.landing.step3) — expandir
para "Termo de Consentimento (autorização simples para consulta por vídeo)";
"Grau de risco" e "SST" em src/app/empresas/cadastro/page.tsx (linhas 287,
342-346) — adicionar tooltip explicativo; "PGR/NR-1" em
src/app/empresas/denuncia/[slug]/page.tsx (linha ~100) — adicionar nota de
rodapé explicando o que significa; a sigla "CDC" na política de cancelamento em
português (translations.ts, ~linha 7286) — ajustar para incluir "(Código de
Defesa do Consumidor)" por extenso, como já foi feito nas versões em inglês e
espanhol da mesma chave. Ações de auditoria no admin
(src/app/(dashboard)/admin/audit/AdminAuditClient.tsx, linhas ~80, 120-135) hoje
mostram enums crus como LOGIN, CREATE_RECORD, EXPORT_DATA — crie um mapa de
tradução desses valores para frases legíveis ("Fez login", "Criou um
prontuário", "Exportou dados") e use esse mapa na exibição da tabela.
```

**15. Adicionar placeholders e feedback em tempo real no formulário de cadastro**
```
Em src/components/auth/register-shared.tsx, os campos firstName, lastName,
email e password (por volta das linhas 500-570) não têm placeholder/exemplo de
preenchimento, diferente do padrão já usado em verify-sms (linha ~208, que usa
placeholder). Adicione placeholders com exemplos (ex: "Maria", "Silva",
"seu@email.com") nesses campos. Além disso, o aviso de "campos faltando"
(missingFields, linhas ~654-663) só aparece agregado no rodapé depois que o
usuário tenta entender por que o botão está desabilitado — adicione validação
visual em tempo real por campo (ex: borda vermelha ou ícone de alerta ao lado do
campo específico que falta preencher), em vez de depender só da lista agregada
no fim.
```

**16. Melhorar a tela de fila humanitária sem voluntários online**
```
Em src/app/humanitarian/[slug]/page.tsx (linhas ~494-499 e ~763-767), quando
onlineVolunteers é 0, a UI mostra apenas um aviso âmbar sem nenhuma ação
sugerida. Adicione: (a) uma opção de ativar notificação (push ou e-mail, usando
a infraestrutura de push já existente no projeto em src/app/api/push) para
avisar o usuário quando um voluntário entrar; (b) reforçar, próximo a esse
aviso (não apenas no rodapé da página), o contato de emergência local já
presente em outro componente (CrossBorderNotice / hum.page.disclaimer), com
destaque visual maior do que o atual texto pequeno cinza.
```

**17. Padronizar tema visual do HumanitarianPhoneGate com o restante do fluxo**
```
src/components/humanitarian/HumanitarianPhoneGate.tsx (linha ~96) usa
bg-white border border-emerald-200 fixo, mesmo quando renderizado dentro do
HumanitarianShell com fundo escuro (bg-slate-950) em
src/app/humanitarian/[slug]/page.tsx (linha ~484). Outros componentes do mesmo
fluxo, como HumanitarianTriageForm e TelemedicineTcleConsent, já recebem uma
prop dark e se adaptam ao tema escuro. Adicione a mesma prop dark ao
HumanitarianPhoneGate e ajuste suas classes de estilo para usar a paleta
emerald/slate-900 já usada nos demais componentes do fluxo, eliminando o
contraste visual atual.
```

**18. Adicionar validação visível no formulário de prescrição de enfermagem**
```
Em src/components/nurse/MedPrescriptionModule.tsx, a função issue() (linha
aproximada a localizar por "meds.length === 0") simplesmente retorna sem fazer
nada quando campos obrigatórios (nome do medicamento, dosagem, via, frequência)
não estão preenchidos, sem mostrar nenhuma mensagem ao usuário. Adicione uma
mensagem inline visível indicando especificamente quais campos estão faltando
antes de permitir o clique em "Emitir", seguindo o mesmo padrão de validação
usado no formulário de prescrição do professional
(src/app/(dashboard)/professional/prescriptions/page.tsx).
```

**19. Agrupar visualmente o formulário de anamnese nutricional**
```
Em src/components/nutritionist/FoodAnamnesisModule.tsx, os 17 campos (hábitos
de sono, alimentação, histórico clínico, objetivo de peso, etc.) estão
dispostos em uma única lista plana, sem cabeçalhos de seção. Agrupe os campos
em blocos com títulos claros (ex: "Rotina e hábitos", "Histórico de saúde",
"Objetivo do acompanhamento"), marque visualmente quais campos são obrigatórios,
e adicione tratamento de erro visível em handleSave para o caso de falha de
rede/resposta não-OK do fetch (hoje a falha não é comunicada ao usuário).
```

**20. Migrar o psicanalista para o componente compartilhado de disponibilidade**
```
src/app/(dashboard)/psychoanalyst/settings/availability/page.tsx é uma
reimplementação própria e independente da tela de configuração de
disponibilidade, com endpoint e lógica próprios. Todos os outros portais
(psychologist, farmaceutico, odontologo, enfermeiro, nutricionista,
professional) reexportam o componente compartilhado AvailabilitySettings, e
integrative-therapist já demonstra o padrão correto de reuso com apiPath
customizado (<AvailabilitySettings apiPath="..." />). Refatore
psychoanalyst/settings/availability/page.tsx para seguir o mesmo padrão de
integrative-therapist, usando o componente AvailabilitySettings compartilhado
com o apiPath apontando para /api/psychoanalyst/availability, e remova a
implementação duplicada.
```

### 🟢 Prioridade menor (polimento)

**21. Adicionar tela de boas-vindas antes do formulário de configuração do profissional**
```
src/app/(dashboard)/professional/settings/page.tsx é um formulário de 6 seções
recolhíveis (identidade, credenciais, consulta, disponibilidade, assinatura
digital, doctor connection) que o profissional vê logo após o cadastro, sem
nenhuma orientação de por onde começar. Adicione uma tela ou banner de
boas-vindas antes do formulário (pode ser um card no topo, dispensável após a
primeira visita) sugerindo a ordem recomendada de preenchimento: 1. Identidade,
2. Credenciais/documento de licença, 3. Disponibilidade, 4. Pronto para atender.
Adicione também uma barra de progresso global (não apenas por seção) indicando
quantas das 6 seções já foram concluídas.
```

**22. Revisão de espanhol nas telas humanitárias**
```
A área humanitária (chaves hum.* e patient.angelOptOut.* em
src/lib/i18n/translations.ts) tem cobertura completa em espanhol, mas contém
pequenos erros/falsos cognatos, como "Firme el término de consentimiento (TCLE)"
(hum.landing.step3), que deveria usar uma palavra mais natural em espanhol para
"documento/formulário de consentimiento" em vez de "término" (falso cognato do
português "termo"). Revise todas as strings es nessas chaves com atenção a
falsos cognatos português-espanhol.
```

**23. Adicionar seletor de idioma nas páginas públicas de perfil de médico**
```
src/app/especialistas/[especialidade]/[cidade]/[slug]/page.tsx define o idioma
via cookie doctor8.lang já salvo anteriormente, mas não oferece nenhum seletor
de idioma visível na própria página, diferente do HumanitarianLangSwitcher já
usado nas páginas humanitárias. Adicione um seletor de idioma equivalente
nessa página pública, para visitantes que chegam direto por link e ainda não
têm o cookie de idioma definido.
```

**24. Adicionar categorias pré-definidas no ledger financeiro da organização**
```
Em src/app/(dashboard)/organization/ledger/page.tsx (linhas ~137-139), o campo
"categoria" é um texto livre sem sugestões. Transforme em um select com
categorias contábeis padrão (ex: Aluguel, Salários, Material, Impostos,
Marketing, Outros) mais uma opção "Outra categoria" que libera um campo de
texto livre complementar, evitando duplicidade de categorias por variação de
digitação (ex: "aluguel" vs "Aluguel" vs "ALUGUEL").
```

**25. Explicar campos bloqueados nas configurações da organização**
```
Em src/app/(dashboard)/organization/settings/page.tsx (linhas ~88-95), os
campos CNPJ e razão social aparecem desabilitados sem nenhuma explicação do
motivo. Adicione um texto de apoio abaixo desses campos, do tipo "Para alterar
estes dados, entre em contato com o suporte", para deixar claro que não é um
erro do sistema.
```

---

## Como usar este documento

Sugestão de ordem de execução no Cursor: prompts 1 a 5 primeiro (são correções de bug/risco, não só de "polimento"), depois 6 a 13 (prioridade alta, maior impacto em confusão do usuário), e os demais conforme disponibilidade. Cada prompt pode ser colado individualmente — foram escritos para serem autocontidos, sem depender de contexto adicional desta conversa.

Recomendo verificar no Cursor, antes de aplicar cada prompt, se os números de linha citados ainda correspondem à versão atual do arquivo (o código pode ter mudado desde esta análise em 11/07/2026).
