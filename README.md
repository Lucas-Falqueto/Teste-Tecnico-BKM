# Triagem Automática de Mensagens

Pipeline Node.js que simula o recebimento de mensagens (WhatsApp/e-mail) monitorando a leitura de arquivos `.json`, `.txt` na pasta `inbox/`. O sistema processa a fila, classifica a intenção via OpenAI com **tool use**, extrai campos estruturados, persiste as informações em um banco SQLite e gera um resumo diário em texto.

## Sumário
- [Arquitetura](#arquitetura)
- [Decisões de design](#decisões-de-design)
- [Passo a Passo para Iniciar](#passo-a-passo-para-iniciar)
- [Testes](#testes)
- [Estrutura de pastas](#estrutura-de-pastas)
- [O que faria diferente com mais tempo](#o-que-faria-diferente-com-mais-tempo)
- [Estimativa de custo mensal](#estimativa-de-custo-mensal-500-mensagensdia)
- [Limitações assumidas](#limitações-assumidas)

---

## Arquitetura

```
inbox/  (.txt | .json)
   │
   ▼
FolderWatcher (chokidar)
   │  normaliza → Message { id, canal, remetente, timestamp, texto }
   ▼
Classificação + Extração  (OpenAI gpt-4o-mini, tool use forçado)
   │  → categoria + confiança + cliente_nome + numero_processo + prazo_data + resumo
   ▼
Validação pós-LLM  (regex valida FORMATO: nº CNJ, data — nunca decide categoria)
   │  falha de formato ou confiança < 0.6 → status_revisao = 'erro_extracao'
   ▼
Persistência  (SQLite via better-sqlite3)
   │
   ▼
Resumo diário  (node-cron às 18h | npm run resumo)
   urgentes no topo → totais por categoria
```

### Categorias (enum fechado)

| Categoria            | Quando usar                                                                        |
|----------------------|------------------------------------------------------------------------------------|
| `urgente_prazo`      | Prazo judicial já vencido ou vencendo em ≤5 dias                                  |
| `duvida_processo`    | Cliente existente com dúvida sobre andamento, decisão ou status de processo        |
| `agendamento`        | Marcação de reunião; ou novo cliente em primeiro contato buscando atendimento      |
| `financeiro`         | Pagamento, comprovante, boleto, honorários, depósito, parcela paga                 |
| `documento_recebido` | Envio de certidões, contratos, procurações, laudos, CTPS, perícias                 |
| `spam_irrelevante`   | Publicidade, promoções, saudação vazia, número errado, sem contexto jurídico       |

---

## Decisões de design

### Por que Node.js puro (sem n8n/Make)?
Controle total sobre o tool use do OpenAI, validação com Zod e lógica de retry. n8n/Make dificultariam implementar tool_choice forçado e validação estruturada da resposta.

### Por que OpenAI tool use e não "responda em JSON"?
`tool_choice: forced` garante que o modelo **sempre** retorne a estrutura definida, validada por Zod. Elimina alucinações de formato e exceções de parse — o modelo não pode "esquecer" um campo.

### Por que regex fora da classificação?
A categoria é decidida **100% por compreensão semântica** (LLM). Regex entra apenas depois, para validar o **formato** do número CNJ e normalizar datas — nunca para decidir categoria. Garante que mensagens ambíguas (ex.: "Vocês cobram para agendar?") sejam classificadas por intenção, não por palavra-chave.

### Por que SQLite e não PostgreSQL?
Zero setup, portável, suficiente para volume de um escritório. A camada de acesso (`storage/messageRepo.js`) isola o SQL — trocar para Postgres é mudar só esse arquivo.

### Tratamento de alucinação e erro
- `confianca < 0.6` → `status_revisao = 'erro_extracao'` (fila de revisão humana)
- Falha de validação de formato CNJ/data → idem
- Falha na API (rede, rate limit) → retry exponencial até 3 tentativas
- **A categoria nunca é alterada** por validação — só o status de revisão

---

## Pré-requisitos

- Node.js ≥ 18
- Chave da OpenAI API

---

## Passo a Passo para Iniciar

**1. Clone o repositório**
```bash
git clone https://github.com/Lucas-Falqueto/Teste-Tecnico-BKM.git
cd Teste-Tecnico-BKM
```

**2. Instale as dependências**
```bash
npm install
```

**3. Configure o ambiente**
Crie uma cópia do arquivo de configuração:
```bash
cp .env.example .env
```
Abra o arquivo `.env` gerado e preencha a sua chave da OpenAI.
Variáveis disponíveis:
- `OPENAI_API_KEY`: Chave da API OpenAI (obrigatória)
- `OPENAI_MODEL`: Modelo a usar (padrão: `gpt-4o-mini`)
- `CONFIANCA_MINIMA`: Limiar para fila de revisão humana (padrão: `0.6`)

**4. Inicie o sistema**
```bash
npm start
```
O pipeline iniciará o watcher e ficará aguardando arquivos na pasta `inbox/`.

---

### Simulação via arquivo

Coloque um arquivo na pasta `inbox/`:

**JSON array** (formato principal):
```json
[
  {"id": 1, "canal": "whatsapp", "de": "+5527999990001", "texto": "Oi, preciso saber do meu processo."},
  {"id": 2, "canal": "email",    "de": "joao@gmail.com",  "texto": "Segue a procuração assinada."}
]
```

**Texto simples** (formato alternativo):
```
remetente: Maria Souza

Olá, preciso do boleto de honorários de julho.
```

### Relatório diário

```bash
# Gerar manualmente para hoje
npm run resumo

# Para uma data específica
node resumo/gerarResumo.js 2026-08-11
```

O cron automático gera o resumo todo dia às 18h no stdout.

---

## Testes

```bash
# Unitários (sem API key — validadores, normalização CNJ/data)
npm run test:unit

# Integração com API real (requer OPENAI_API_KEY no .env)
npm run test:integration
```

---

## Estrutura de pastas

```
.
├── channels/
│   ├── channel.js          Interface base (plugável para canais reais)
│   └── folderWatcher.js    Watcher de pasta (chokidar)
├── llm/
│   ├── openaiClient.js     Cliente com retry exponencial
│   ├── classifier.js       Orquestra LLM → Zod
│   ├── prompt.js           System prompt compacto + few-shot
│   └── schema.js           Schema Zod + definição do tool OpenAI
├── validation/
│   └── validators.js       Regex pós-LLM (CNJ, data) — nunca decide categoria
├── storage/
│   ├── db.js               SQLite singleton (WAL mode)
│   └── messageRepo.js      Repositório com queries do relatório
├── resumo/
│   └── gerarResumo.js      Gerador do resumo diário (.txt)
├── relatorios/             Destino onde os resumos em texto são salvos
├── models/
│   └── message.js          Tipos e enum de categorias
├── tests/
│   ├── fixtures/messages.js  20 mensagens + casos adversariais
│   ├── validators.test.js
│   └── classifier.test.js
├── inbox/                  Pasta observada (simulação)
├── index.js                Entrada do pipeline
└── .env.example
```

---

## O que faria diferente com mais tempo

1. **Interface web de revisão** — tela para o advogado ver as mensagens com `erro_extracao` e corrigi-las, alimentando o banco de exemplos negativos
2. **Fine-tuning ou few-shot dinâmico** — usar os casos corrigidos pelo advogado para melhorar o prompt automaticamente
3. **Canais reais** — `WhatsAppBusinessChannel` e `GmailChannel` implementando a interface `Channel` sem mudar nada no pipeline
5. **Alertas proativos** — notificar via Slack/e-mail quando uma `urgente_prazo` é detectada, sem esperar o cron das 18h

---

## Estimativa de custo mensal (~500 mensagens/dia)

| Item | Cálculo | Custo/mês |
|---|---|---|
| Input tokens | 500 msg/dia × 30 dias × ~850 tokens = 12,75M tokens × R$ 0,82/1M | **~R$ 10,50** |
| Output tokens | 500 × 30 × ~120 tokens = 1,8M tokens × R$ 3,30/1M | **~R$ 5,94** |
| Infraestrutura | VPS mínima (Node.js + SQLite) | **~R$ 27,50** |
| **Total** | (Conversão estimada: US$ 1 = R$ 5,50) | **~R$ 44,00 / mês** |

---

## Limitações assumidas

- **Datas relativas** ("semana que vem") dependem do LLM receber a data de recebimento no contexto — a data é sempre enviada no prompt
- **Confiança baixa** (< 0.6) gera fila de revisão humana — ajuste via `CONFIANCA_MINIMA` no `.env`
- **Canal real**: criar nova classe herdando `Channel` e implementar `fetchNewMessages()` — o pipeline não muda
