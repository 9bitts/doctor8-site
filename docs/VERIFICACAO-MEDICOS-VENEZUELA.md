# Verificação de Médicos Venezuelanos — Doctor8 / SOS Venezuela

> Documento operacional para uso manual. Sem dependência de sistema.
> Versão: julho/2026 · Responsável: time de verificação Doctor8

---

## 1. Resumo executivo

A Venezuela **não possui** consulta pública equivalente ao CRM brasileiro com status "ativo/regular". A verificação confiável combina:

1. **Consulta passiva no SACS** (portal oficial do MPPS) por **cédula**
2. **Documentos enviados pelo próprio médico** (título, cédula, carnet do colegio)
3. **Cruzamento manual** dos dados

A consulta SACS é **somente leitura** — não gera denúncia nem coloca o médico "no radar" do governo.

**Portal oficial:** https://sistemas.sacs.gob.ve/consultas/prfsnal_salud

---

## 2. O que verificar em cada camada

| Camada | Ente | O que prova | Como verificar |
|--------|------|-------------|----------------|
| Registro nacional | **SACS / MPPS** | Título registrado + matrícula MPPS | Consulta pública por cédula |
| Formação | **Universidade** | Graduação como Médico Cirujano | Título (documento) |
| Colegiatura | **Colegio de Médicos** (estadual) | Inscrição gremial + solvencia | Carnet ou constancia deontológica |
| Especialidade | **SACS Postgrados** | Pós registrado | Botão "Postgrados" no SACS + diploma |

---

## 3. Critério de aceite — Doctor8

### Aprovar somente se:

- [ ] Aparece no SACS consultando por **cédula**
- [ ] Profissão no SACS = **MÉDICO(A) CIRUJANO(A)**
- [ ] Nome no SACS = nome nos documentos enviados
- [ ] Matrícula MPPS no SACS = matrícula informada pelo médico
- [ ] Título enviado diz explicitamente **"Médico Cirujano"** (ou "Médica Cirujana")
- [ ] Università no título é reconhecida (ver lista na seção 8)

### Revisão manual (não rejeitar de imediato):

- SACS ok, mas falta título ou carnet do colegio
- Portal SACS fora do ar no momento da consulta
- Nome com pequena variação (acentos, ordem) mas claramente a mesma pessoa
- Médico no exterior há muito tempo, sem carnet atualizado

### Rejeitar:

- **Não aparece** no SACS (após 2 tentativas em dias diferentes)
- Profissão no SACS **diferente** de Médico Cirujano (ex.: enfermero, técnico, odontólogo)
- Afirma ser médico cirujano, mas SACS mostra **Médico Integral Comunitario** e vocês exigem cirujano
- Título **não** diz Médico Cirujano
- Nome ou matrícula **incompatíveis** entre SACS e documentos
- Indícios de documento adulterado (fontes diferentes, recortes, dados sobrepostos)
- Recusa em enviar cédula ou selfie com cédula

---

## 4. Fluxo operacional — passo a passo

```
┌─────────────────────────────────────────────────────────────┐
│  MÉDICO SOLICITA CADASTRO / VOLUNTARIADO SOS VENEZUELA      │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PASSO 1 — Enviar mensagem padrão solicitando documentos    │
│  (modelo na seção 6)                                        │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PASSO 2 — Receber documentos + preencher Ficha (seção 5)   │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PASSO 3 — Consulta SACS por cédula (seção 7)               │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PASSO 4 — Cruzamento manual (seção 5, tabela final)        │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
              ┌─────────────┴─────────────┐
              ▼                           ▼
     ┌────────────────┐         ┌────────────────┐
     │   APROVADO     │         │ REVISÃO /      │
     │                │         │ REJEITADO      │
     └────────────────┘         └────────────────┘
              │                           │
              ▼                           ▼
     Liberar acesso              Comunicar motivo +
     na plataforma               pedir correção ou
                                encerrar processo
```

**Prazo sugerido:** 48–72 h úteis após recebimento completo dos documentos.

**Responsável:** 1 verificador por candidato (nome anotado na ficha).

---

## 5. Ficha de verificação (copiar por candidato)

```
═══════════════════════════════════════════════════════════════
FICHA DE VERIFICAÇÃO — MÉDICO VENEZUELANO
Doctor8 / SOS Venezuela
═══════════════════════════════════════════════════════════════

Data da verificação: ____/____/2026
Verificador(a): ________________________________
ID candidato Doctor8 (se houver): _______________

── DADOS INFORMADOS PELO MÉDICO ──────────────────────────────

Nome completo: _______________________________________________
Cédula: [ ] V  [ ] E   Nº ____________________________________
Matrícula MPPS informada: ____________________________________
Estado onde se colegiou: _____________________________________
Nº colegiatura informado: ____________________________________
Universidade de graduação: ___________________________________
Ano de graduação: __________
Especialidade declarada (se houver): _________________________
E-mail: ______________________________________________________
Telefone: ____________________________________________________

── DOCUMENTOS RECEBIDOS ──────────────────────────────────────

[ ] Cédula de identidade (frente e verso)
[ ] Selfie segurando a cédula ao lado do rosto
[ ] Título de Médico Cirujano (foto legível ou fondo negro)
[ ] Carnet del Colegio de Médicos
[ ] Constancia deontológica ou certificación SACS (opcional)
[ ] Diploma de especialidade / postgrado (se aplicável)

Data de recebimento: ____/____/2026
Documentos completos?  [ ] Sim  [ ] Não — faltam: _____________

── RESULTADO CONSULTA SACS ─────────────────────────────────────
URL: https://sistemas.sacs.gob.ve/consultas/prfsnal_salud
Data/hora da consulta: ____/____/2026  ___:___

[ ] Encontrado no SACS
[ ] NÃO encontrado no SACS
[ ] Portal indisponível (tentar novamente em: ____/____/2026)

Nome no SACS: ________________________________________________
Profissão no SACS: ___________________________________________
Matrícula MPPS no SACS: ______________________________________
Data de registro SACS: ____/____/________
Tomo / Folio: __________ / __________

Postgrados (clicar botão no SACS):
[ ] Não possui postgrados registrados
[ ] Possui — especialidade(s): _______________________________
[ ] Especialidade confere com documento enviado

Print/snapshot da consulta salvo?  [ ] Sim  [ ] Não
Arquivo: _____________________________________________________

── CRUZAMENTO MANUAL ──────────────────────────────────────────

                                    │ Informado │ SACS │ Documento
────────────────────────────────────┼───────────┼──────┼──────────
Nome                                │           │      │
Cédula                              │           │  —   │
Profissão (deve ser Méd. Cirujano)  │           │      │
Matrícula MPPS                      │           │      │
Universidade (plausível?)           │           │  —   │

Título diz "Médico Cirujano"?       [ ] Sim  [ ] Não
Carnet colegio confere nome/cédula?  [ ] Sim  [ ] Não  [ ] N/A

Inconsistências encontradas:
_______________________________________________________________
_______________________________________________________________

── DECISÃO FINAL ───────────────────────────────────────────────

[ ] APROVADO — todos os critérios atendidos
[ ] REVISÃO MANUAL — motivo: __________________________________
[ ] REJEITADO — motivo: _______________________________________

Observações:
_______________________________________________________________
_______________________________________________________________

Assinatura verificador: ______________________  Data: ____/____/2026
═══════════════════════════════════════════════════════════════
```

---

## 6. Mensagens padrão para enviar ao médico

### 6.1 Português (uso interno Doctor8)

**Assunto:** Verificação de credenciais — Doctor8 / SOS Venezuela

Olá, Dr(a). [NOME],

Para concluir seu cadastro na Doctor8 (programa SOS Venezuela), precisamos verificar suas credenciais profissionais. Este processo é padrão para todos os médicos venezuelanos da plataforma.

**Por favor, envie:**

1. Foto da **cédula de identidade** (frente e verso)
2. **Selfie** segurando a cédula ao lado do rosto
3. Foto legível do **título universitário** (deve constar "Médico Cirujano" ou "Médica Cirujana")
4. Foto do **carnet do Colegio de Médicos** (se possuir)
5. Informar: **cédula**, **matrícula MPPS**, **estado do colegio** e **universidade de graduação**

Também realizaremos consulta no portal oficial **SACS** (Ministerio de Salud) — consulta pública, sem solicitação formal ao governo.

Prazo para envio: 5 dias úteis.

Qualquer dúvida, responda este contato.

Equipe Doctor8

---

### 6.2 Español (enviar ao médico venezuelano)

**Asunto:** Verificación de credenciales — Doctor8 / SOS Venezuela

Hola, Dr(a). [NOMBRE],

Para completar su registro en Doctor8 (programa SOS Venezuela), necesitamos verificar sus credenciales profesionales. Este proceso es estándar para todos los médicos venezolanos en la plataforma.

**Por favor, envíe:**

1. Foto de su **cédula de identidad** (frente y reverso)
2. **Selfie** sosteniendo la cédula junto a su rostro
3. Foto legible de su **título universitario** (debe decir "Médico Cirujano" o "Médica Cirujana")
4. Foto de su **carnet del Colegio de Médicos** (si lo tiene)
5. Indique: **número de cédula**, **matrícula MPPS**, **estado del colegio** y **universidad de graduación**

También consultaremos el portal oficial **SACS** (Ministerio del Poder Popular para la Salud). Es una consulta pública de verificación — no implica ninguna solicitud formal ni denuncia ante el gobierno.

Plazo de envío: 5 días hábiles.

Cualquier duda, responda a este contacto.

Equipo Doctor8

---

### 6.3 Mensagem de aprovação

**PT:** Seu cadastro foi verificado e aprovado. Bem-vindo(a) ao SOS Venezuela / Doctor8.

**ES:** Su registro ha sido verificado y aprobado. Bienvenido(a) a SOS Venezuela / Doctor8.

---

### 6.4 Mensagem de pendência

**ES:** Hemos revisado su documentación pero necesitamos los siguientes documentos/informaciones adicionales antes de completar la verificación: [LISTAR]. Plazo: 5 días hábiles.

---

### 6.5 Mensagem de rejeição (modelo)

**ES:** Lamentamos informarle que no fue posible verificar sus credenciales como Médico Cirujano en este momento.

**Motivo:** [ex.: no aparece en el registro SACS / la profesión registrada no corresponde a Médico Cirujano / inconsistencia entre documentos y registro oficial]

Si considera que se trata de un error, puede enviar documentación adicional (constancia SACS, título en fondo negro, constancia deontológica del colegio) para una nueva revisión.

Equipo Doctor8

---

## 7. Guia rápido — consulta SACS

### Passo a passo

1. Acesse: https://sistemas.sacs.gob.ve/consultas/prfsnal_salud
2. **TIPO DE BÚSQUEDA:** selecione **N°. CÉDULA**
3. **VENEZOLANO(A) / EXTRANJERO(A):**
   - **V** = venezuelano
   - **E** = estrangeiro residente
4. Digite o número **sem** o prefixo (ex.: para V-7661995, digite `7661995` ou conforme o campo aceitar)
5. Clique **Consultar**
6. Anote todos os campos do resultado
7. Se houver botão **Postgrados**, clique e registre especialidades
8. **Salve print** da tela (evidência para a ficha)

### Busca por matrícula (alternativa — menos confiável)

- Selecione **N°. MATRÍCULA**
- No dropdown **MATRÍCULA SELECCIONE...**, escolha o **tipo de profissão** antes de buscar
- Mesmo quando funciona, **não** exibe status "activo/regular"
- **Preferir sempre busca por cédula**

### Se o portal não abrir

- Tentar navegador **Mozilla Firefox** (recomendação oficial SACS)
- Tentar em horário diferente (instabilidade frequente)
- Segunda tentativa em 24–48 h
- Se indisponível após 2 tentativas: aguardar documentos e usar cruzamento manual; marcar ficha como "REVISÃO — SACS indisponível"

### O que o SACS NÃO informa

- Status "activo", "regular" ou "solvente"
- Cumprimento do Artículo 8 (servicio rural)
- Situação no colegio médico
- Sanciones deontológicas

---

## 8. Universidades reconhecidas — Médico Cirujano (referência)

Formação tradicional (título **Médico Cirujano**):

| Sigla | Universidad |
|-------|-------------|
| UCV | Universidad Central de Venezuela |
| ULA | Universidad de Los Andes |
| LUZ | Universidad del Zulia |
| UC | Universidad de Carabobo |
| UNERG | Universidad Nacional Experimental Rómulo Gallegos |
| UDO | Universidad de Oriente |
| ULA-Mérida | Universidad de Los Andes — Núcleo Mérida |
| UNE | Universidad Nacional Experimental |
| UDO / otras sedes | Verificar caso a caso |

**Atenção — perfil diferente (avaliar política da Doctor8):**

- **Médico Integral Comunitario (MIC)** — Universidade de Ciencias de la Salud; legalmente médico na Venezuela, formação distinta do cirujano tradicional
- **Programas não universitários** — pessoas que se dizem "médicos integrales" **sem** registro no SACS: **rejeitar**

---

## 9. Colegios médicos por estado (contato)

Usar **somente** se o médico enviar carnet e vocês precisarem confirmar formato, ou se o médico **voluntariamente** enviar constancia deontológica.

| Estado / Região | Colegio | Contato |
|-----------------|---------|---------|
| Caracas / Área Metropolitana | CMDMC | cmdmc.com.ve · (212) 979-0377 · tesoreria@cmdmc.com.ve |
| Miranda | Colegio de Médicos del Estado Miranda | Buscar site oficial estadual |
| Bolívar | Colegio de Médicos del Estado Bolívar | Buscar site oficial estadual |
| Zulia | COMEZU | comezu.com · +58 414-6259374 · colegiodemedicoszulia@comezu.com |
| Aragua | Colegio de Médicos de Aragua | colegiodemedicosaragua.org |
| Outros estados | Colegio de Médicos del Estado [NOME] | Um colegio por estado |

**Não** solicitar ao colegio verificação de terceiros sem consentimento do médico.

---

## 10. Red flags — fraude e inconsistência

| Sinal | Ação |
|-------|------|
| Diz médico, SACS mostra outra profissão | Rejeitar |
| Não aparece no SACS | Rejeitar ou revisão com nova documentação |
| Título sem "Médico Cirujano" | Rejeitar |
| Università desconhecida ou "integración comunitaria" sem registro | Rejeitar |
| Matrícula MPPS diferente entre SACS e carnet | Revisão manual — possível erro de digitação ou fraude |
| Fotos de baixa qualidade que impedem leitura | Pedir reenvio |
| Mesma cédula em cadastros de nomes diferentes | Escalar — possível fraude |
| Pressa excessiva + recusa de enviar cédula | Rejeitar |

---

## 11. Perguntas frequentes (FAQ interno)

**A consulta SACS coloca o médico no radar do governo?**
Não. É consulta pública passiva, equivalente a um paciente verificando seu médico.

**Por que busca por matrícula não funciona bem?**
Exige selecionar o tipo de profissão no dropdown e, mesmo assim, não mostra status de regularidade. Usar cédula.

**Médico no exterior há 10 anos, sem carnet atual — aprovar?**
Se SACS ok + título Médico Cirujano + cédula/selfie ok → pode aprovar com observação "sem carnet colegio — verificado via SACS".

**Aceitar Médico Integral Comunitario?**
Decisão de política Doctor8. Este documento recomenda **Médico Cirujano** como critério padrão SOS Venezuela.

**E se o SACS estiver fora do ar?**
Aguardar 24–48 h, segunda tentativa. Se persistir: revisão manual com título + carnet; não aprovar só com documentos sem SACS salvo exceção documentada.

**Médico com CRM brasileiro também — precisa verificar Venezuela?**
Se atende pacientes venezuelanos como médico venezuelano na plataforma, sim — verificar origem. CRM brasileiro é processo separado (Revalida).

---

## 12. Registro de verificações (planilha simples)

Manter planilha com colunas:

| Coluna | Exemplo |
|--------|---------|
| Data | 10/07/2026 |
| Nome | Oramis Rios |
| Cédula | V-7661995 |
| Matrícula MPPS | MPPS-39663 |
| Profissão SACS | MÉDICO(A) CIRUJANO(A) |
| SACS ok? | Sim |
| Título ok? | Sim |
| Decisão | Aprovado |
| Verificador | Gilese |
| Observações | Postgrados: — |

---

## 13. Contatos úteis

| Ente | Função | Link / contato |
|------|--------|----------------|
| SACS | Registro nacional de títulos | sacs.gob.ve · sistemas.sacs.gob.ve/consultas |
| MPPS | Ministério rector de salud | mpps.gob.ve |
| FMV | Federación Médica Venezolana (gremial) | Organização nacional dos colegios |

---

*Documento preparado para operação manual. Revisar trimestralmente — portais venezuelanos mudam com frequência.*
