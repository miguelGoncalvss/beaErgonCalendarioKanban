# BeaErgon - Calendário & Kanban

Aplicação front-end desenvolvida em **React 19 + TypeScript + Tailwind CSS** que integra um calendário interativo com anotações e um quadro Kanban de 4 colunas em tela dividida (50% / 50%).

E-mail:contato@ergon.com.br                                                                                                                                                                           • Senha: admin123 

## 🎯 Funcionalidades

### 📅 Lado Esquerdo: Calendário com Anotações
- **Navegação completa**: navegação entre meses com botões anterior/próximo, seleção rápida de mês (Janeiro a Dezembro), seleção de ano e botão "Hoje".
- **Grid de dias**: dias do mês atual e preenchimento dos meses anterior/próximo, destaque do dia atual e dia selecionado.
- **Anotações completas**:
  - Clique em qualquer dia para abrir o modal de anotações.
  - Criar anotações com título, descrição, categoria (*Geral, Lembrete, Reunião, Ideia, Urgente*) e horário.
  - Marcar anotações como concluídas (checklist) ou pendentes.
  - Excluir anotações.
  - Pré-visualização com tags coloridas diretamente nas células do calendário.
  - Barra de busca rápida por anotações no cabeçalho do calendário.
- **Integração com Kanban**: células do calendário exibem indicadores de tarefas com prazo de entrega na respectiva data, incluindo alertas para tarefas vencidas.

---

### 📋 Lado Direito: Quadro Kanban (4 Colunas)
1. **A Fazer** (Azul)
2. **Fazendo** (Âmbar/Amarelo)
3. **Concluído** (Verde esmeralda)
4. **Atrasado** (Vermelho/Rosa)

- **Arrastar e Soltar (Drag & Drop)** nativo entre todas as 4 colunas.
- **Menu de Ações Rápidas**: mover para outra coluna com um clique, editar e excluir tarefas.
- **Detecção automática de atraso**: se uma tarefa não concluída tiver prazo anterior ao dia de hoje, um alerta surge com um botão para mover automaticamente para a coluna "Atrasado".
- **Filtros e Busca**: busca em tempo real por título/descrição/tags e filtro por prioridade (*Urgente, Alta, Média, Baixa*).
- **Vínculo com Calendário**: ao clicar no prazo de uma tarefa, o dia correspondente abre no calendário.

---

### 💾 Persistência e Extras
- **Persistência local (LocalStorage)**: suas anotações e tarefas são salvas no navegador automaticamente.
- **Dados de demonstração**: o app já inicia com exemplos reais de tarefas e notas pré-configuradas.
- **Botão Restaurar**: opção de restaurar os dados de demonstração no cabeçalho.
- **Relógio em tempo real** e resumo de contadores no topo.
- **Responsivo**: no desktop divide a tela 50/50 perfeitamente; em telas menores permite alternar entre "Lado a Lado", "Calendário" ou "Kanban".

---

## 🚀 Como Executar

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Iniciar servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:5173`

3. **Gerar build de produção**:
   ```bash
   npm run build
   ```
