# Decisões e limites

[← Voltar ao README](../README.md)

O prazo de **sete dias** exigiu priorizar as regras essenciais e registrar escolhas conscientes. **O que foi decidido aqui não substitui o refinamento de negócio com cliente ou Product Owner (PO).**

## Backend

### Decisões técnicas

| Necessidade | Decisão | Justificativa e consequência |
| --- | --- | --- |
| Casos de uso legíveis | **Repository Pattern simplificado**, com métodos operacionais (`buscarParaAtualizacao`, `listarParaAuditoria`) | SQL e detalhes de persistência saem do caso de uso. Este depende de implementações concretas, **sem inversão completa de dependência**; interfaces e injeção ficaram fora do escopo. |
| Lances concorrentes | Transações PostgreSQL, bloqueios de registros e valores em centavos inteiros | Evita decisões simultâneas sobre o mesmo líder e reduz inconsistências financeiras. |
| Catálogo externo | Copiar dados básicos do produto ao criar o lote | A disputa continua sem novas consultas à DummyJSON; a imagem permanece uma referência externa. |
| Histórico verificável | Trilha JSONL encadeada e assinada com HMAC-SHA256 fora do PostgreSQL | Detecta divergências entre duas fontes, mas não fornece armazenamento imutável nem transação atômica entre banco e arquivo. |
| Atualização da sala | SSE em memória + consulta do estado persistido | Evita polling frequente; a distribuição de eventos entre múltiplas instâncias exigiria outro mecanismo. |

### Decisões de negócio

- **Lances:** apenas licitantes ofertam durante a disputa, respeitando início, valor mínimo, incremento e proibição de superar o próprio lance.
- **Carteira:** o lance líder compromete o valor. Ao ser superado por um lance legítimo, o comprometimento anterior é liberado. O restante do saldo disponível pode ser usado em outros lotes.
- **Ciclo do lote:** cancelamento e encerramento são distintos; não se cancela um lote já encerrado nem com lances.
- **Prorrogação:** o primeiro lance válido aceito nos dois minutos finais da disputa prorroga o encerramento em dois minutos. Cada lote pode ser prorrogado uma única vez, conforme os critérios de aceitação do documento de requisitos.

### Auditoria: comportamento e limites

**Exemplo:** Ana lidera com um lance legítimo de R$ 100; Bruno a supera legitimamente com R$ 120. Depois, alguém insere diretamente no PostgreSQL um lance de R$ 150 em nome de Ana.

- A inserção manual **não passa pela API**: não compromete R$ 150 na carteira de Ana nem acrescenta uma assinatura à trilha.
- O valor legítimo de **R$ 120 de Bruno permanece comprometido**; o saldo disponível dele segue utilizável em outros lotes.
- A comparação entre banco e trilha aponta histórico **`INCONSISTENTE`**. Uma tentativa posterior de lance pela API pode falhar por divergência da sequência assinada; **não há bloqueio universal de toda forma de adulteração**.
- **Política pretendida:** um histórico `INCONSISTENTE` ou `NAO_VERIFICAVEL` não deve liquidar nem gerar comprovante; saldos já comprometidos não são estornados automaticamente. Isso requer a verificação explícita na liquidação.

**Limite técnico:** banco e JSONL são gravados em sistemas distintos, sem commit atômico. Uma falha entre operações pode criar divergências legítimas. A proteção também depende do sigilo da chave HMAC e do controle de acesso ao diretório da trilha.

## Frontend

### Decisões técnicas

| Necessidade | Decisão | Consequência |
| --- | --- | --- |
| Navegação por papel | Páginas e menu contextual em React Router | Clareza para cada perfil; a autorização de fato ocorre na API. |
| Simplicidade da interface | Reutilizar o cabeçalho e manter páginas independentes | Evita abstrações sem repetição suficiente. |
| Atualização da sala | Eventos SSE disparam consultas HTTP | A interface acompanha mudanças sem confiar no evento como fonte de verdade. |

### Decisões de negócio

- **Vitrine:** lotes agendados, em andamento e encerrados; cancelados não aparecem.
- **Carteira e participações:** páginas distintas para saldo e histórico de disputas.
- **Identidade:** as áreas autenticadas apresentam as informações do próprio usuário. Nas consultas públicas, os participantes são identificados por rótulos anônimos, como `Licitante 1` e `Licitante 2`, preservando seus dados pessoais.
- **Comprovante:** resultado público compartilhável por link, sem geração de PDF.

## Regras adotadas e pontos de refinamento com cliente ou PO

| Pergunta | Decisão adotada neste escopo |
| --- | --- |
| Prorrogar a cada lance nos últimos dois minutos ou limitar as extensões? | **Uma única prorrogação.** |
| Como tratar histórico adulterado, saldo comprometido e estorno? | Definir se uma inconsistência deve bloquear a liquidação e qual procedimento deverá regularizar os saldos. |
| O histórico público deve identificar pessoas pelo nome? | **Não**; a identidade permanece anônima na disputa pública. |

**Fora do escopo:** pagamentos reais, estorno automático, painel de resolução de conflitos e armazenamento de auditoria inviolável.

[← Voltar ao README](../README.md)
