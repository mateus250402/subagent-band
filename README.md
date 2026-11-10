# subagent-band

Mod para o Claude Code (app desktop) que abre o painel **Subagentes** ao lado do chat. Ele mostra, em tempo real:

- cada subagente ativo, com spinner, nome (com um brilho leve passando pelas letras), tempo decorrido e a tarefa;
- uma cor por agente;
- os últimos 5 agentes concluídos, com a duração.

O painel abre sozinho ao iniciar a sessão. Para reabrir, use `/subagentes`.

## Instalação

No prompt de uma sessão de terminal:

```
/plugin install subagent-band --marketplace mateus250402/subagent-band
```

De um shell:

```
claude plugin install subagent-band --marketplace mateus250402/subagent-band
```

No app desktop, onde `/plugin` não roda: clique em **+** ao lado do prompt, depois em **Plugins**, **Add marketplace** com `mateus250402/subagent-band`, e então **Add plugin**.

## Observações

- Usa `$.agent.list()` e o evento `agent.spawn` do Claude Code para acompanhar os subagentes.
- O painel só é desenhado onde a superfície tem espaço ao lado do chat.
