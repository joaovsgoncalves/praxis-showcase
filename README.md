# Praxis

> **Fale. Organize. Execute.**

Praxis é o cockpit diário pessoal que João Victor Gonçalves construiu para transformar intenção em execução: tarefas, hábitos, foco, revisão semanal e captura por voz num lugar só, com a **PraxIA** como copiloto.

**Em produção:** https://dopraxis.vercel.app

> Este repositório é a **vitrine** do projeto: código do app sem histórico, sem documentação interna e sem configuração de infraestrutura. O repositório de trabalho é privado.

## O que faz

- **Hoje:** o que importa no dia, com no máximo dois focos.
- **Hábitos e tarefas** em lentes diferentes, com revisão semanal.
- **Captura por voz:** fala, transcreve e vira tarefa.
- **Treinos, nutrição e finanças** pessoais no mesmo painel.
- **Projetos e frentes** para acompanhar continuidade, não só checklist.

## Stack

- **Front:** React + Vite, Tailwind, shadcn/ui, TanStack Query
- **API:** Express com SQLite (WAL)
- **Deploy:** Vercel para o front; API em VPS própria

## Estrutura

```
src/   → front React (páginas em src/pages)
api/   → API Express
```

## Rodar o front

```bash
npm install
npm run dev
```

A API precisa de variáveis próprias e de um banco SQLite local; não há dados nem credenciais neste repositório.
