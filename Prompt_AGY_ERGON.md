# Prompt para o Codex — evolução da plataforma ERGON

Você está trabalhando no repositório de uma plataforma de gestão de demandas da ERGON. Quero que analise a implementação atual e execute uma evolução gradual do backend, da integração com Supabase e do controle de acesso, preservando as funcionalidades que já funcionam.

## 0. Branch de trabalho e preservação da produção

Toda esta implementação deve acontecer na branch `release-login-nov`. A branch `main` está em produção e deve continuar sustentando o sistema atual durante o desenvolvimento.

O lançamento do novo login está planejado para novembro de 2026, condicionado à validação da solução e à decisão de adotá-la, inclusive em outros departamentos. Essa é uma meta de lançamento, não uma autorização para publicar automaticamente ou uma obrigação de liberar funcionalidades incompletas.

Antes de modificar qualquer arquivo do projeto:

1. Leia as instruções do repositório e inspecione branch atual, estado do Git, remotos e existência local ou remota de `release-login-nov`.
2. Se a branch já existir, retome-a preservando seu histórico e alterações. Se existir somente no remoto, crie a branch local acompanhando a remota.
3. Se ainda não existir, crie `release-login-nov` a partir da versão atualizada de `main` do remoto correto. Faça o fetch quando houver acesso. Se não for possível atualizar as referências, informe a base local disponível e registre essa limitação, sem afirmar que ela está atualizada.
4. Se houver alterações não relacionadas no diretório de trabalho, preserve-as. Prefira um worktree separado quando necessário, mantendo o nome de branch solicitado. Não use reset, clean, stash ou descarte de alterações automaticamente para conseguir trocar de branch.
5. Confirme a branch antes de começar as edições e antes de operações de commit ou push. Todo código, migração, teste e documento desta entrega deve pertencer a `release-login-nov`.

Não faça commits diretamente em `main`, não faça merge de `release-login-nov` em `main`, não faça push para `main` e não publique em produção nesta etapa. Não utilize force push ou recrie a branch apagando seu histórico. Se houver publicação autorizada da branch de desenvolvimento, confira antes os gatilhos de CI/CD para que ela não acione deploy ou migração de produção.

Durante o desenvolvimento, mudanças novas de `main` podem precisar ser incorporadas a `release-login-nov`. Faça isso de maneira controlada, conforme as convenções do repositório, preservando alterações e validando conflitos. Não reescreva o histórico compartilhado sem uma necessidade e autorização específicas.

### Isolamento do ambiente e do banco

Uma branch Git isola alterações de código, mas não isola automaticamente Supabase, banco, Auth, Storage, funções, segredos ou automações de deploy.

- Desenvolva e teste usando Supabase local ou um projeto separado de desenvolvimento/homologação, com banco e Auth próprios.
- Confira o destino das conexões antes de aplicar migrações, alterar RLS, configurar Auth, publicar funções ou executar scripts de preenchimento.
- Não use as credenciais ou o banco de produção para os testes desta branch. Não altere as variáveis do deploy atual da `main`.
- Se não houver ambiente separado disponível, prepare o código e as migrações e use testes locais possíveis. Documente o provisionamento pendente; não use produção como alternativa.
- Use dados fictícios para validar isolamento entre setores. Não copie a base de produção para desenvolvimento por conta própria.
- Qualquer preview autorizado deve utilizar o ambiente de desenvolvimento/homologação e uma URL separada, sem substituir o endereço atual da plataforma.
- Inspecione as automações existentes para identificar deploys e migrações disparados por branch ou push. Não altere o pipeline de produção apenas para viabilizar esta implementação.

### Preparação para novembro

Mantenha um acompanhamento simples no repositório, com etapas concluídas, pendências e comandos de validação, para permitir retomar o trabalho em várias sessões. Reaproveite a documentação existente quando possível.

Prepare, sem executar em produção, um roteiro de lançamento com: validação em homologação, revisão das mudanças, mapeamento dos dados legados, backup, ordem das migrações e do deploy, configuração dos usuários e plano de recuperação. Considere a compatibilidade entre a versão atual e o novo schema durante a transição; se for necessária uma janela de manutenção, documente-a.

A integração em `main` e a publicação ficarão para uma aprovação explícita posterior, após os testes e a validação do uso pelos departamentos. Ao concluir cada bloco, informe o que está pronto na branch e o que ainda falta para o lançamento, sem confundir implementação com disponibilização em produção.

## 1. Contexto e objetivo

Inicialmente, Bea e Vini começarão a utilizar a plataforma. Depois, a empresa deverá trabalhar com aproximadamente quatro setores, cada um com seus funcionários, chefes e demandas. Uma pessoa poderá participar de mais de um setor.

O uso e a manutenção da versão atual continuam pela `main` enquanto o novo login e a estrutura de setores são desenvolvidos em `release-login-nov` para o lançamento planejado em novembro de 2026.

Precisamos preparar essa estrutura agora, sem construir um SaaS completo ou uma arquitetura excessivamente complexa. A prioridade é uma base funcional para autenticação, organização, setores, pessoas, tarefas e permissões.

O resultado esperado é:

- Login individual usando Supabase Auth.
- Supabase PostgreSQL como fonte oficial dos dados da aplicação em produção.
- Separação de demandas por setor, aplicada também no banco.
- Papéis administrativos separados dos setores de atuação.
- Preservação dos dados e dos fluxos atuais, incluindo Kanban, calendário e outros recursos encontrados no projeto.
- Caminho simples para cadastrar setores, convidar pessoas e administrar acessos.
- Estrutura que permita crescer sem refazer a autenticação e o modelo de tarefas.

Os nomes e a quantidade exata dos setores ainda não estão confirmados. Contábil, Fiscal, Departamento Pessoal e Societário são apenas exemplos. Não os transforme em regras fixas. Também não presuma o setor ou a hierarquia de Bea e Vini.

## 2. Postura de trabalho

Trabalhe como um desenvolvedor responsável pela evolução de um sistema existente. Seja detalhista, prático e proporcional ao tamanho do projeto.

- Confira as informações no código antes de tratá-las como fatos.
- Reaproveite componentes, serviços, convenções e ferramentas existentes.
- Evite uma reescrita completa se mudanças localizadas resolverem o problema.
- Não adicione bibliotecas, camadas, serviços ou padrões apenas por preferência pessoal.
- Preserve alterações do usuário e siga as instruções do repositório.
- Explique problemas com impacto concreto e solução proposta, sem linguagem alarmista ou afirmações de vulnerabilidade sem evidência.
- Diferencie o que encontrou no código, o que conseguiu observar no ambiente e o que ainda depende de configuração externa.
- Tome decisões técnicas reversíveis e registre as premissas. Pergunte apenas quando a resposta mudar uma regra de negócio relevante ou for necessária para uma ação externa.
- Faça a análise inicial, apresente um plano curto e prossiga com a implementação local. Não encerre apenas com recomendações.
- Se uma etapa depender de credenciais ou dados não disponíveis, conclua o restante e deixe instruções objetivas para essa etapa.

Este pedido autoriza preparar código, migrações, testes e documentação e validar em ambiente local ou de desenvolvimento identificado. Não execute migrações em produção, exclusões de dados, convites reais por e-mail ou publicação sem uma autorização específica para essas ações. Essa limitação não deve interromper o trabalho local.

## 3. Inspecione o projeto primeiro

Leia as instruções do repositório, README, dependências, estrutura do frontend e backend, configurações de ambiente, schema, migrações, políticas RLS, código de autenticação, serviços de dados e testes.

Uma discussão anterior levantou as seguintes hipóteses, que precisam ser verificadas:

- Frontend em React/Vite.
- Alternância entre Supabase/PostgreSQL e Express/SQLite.
- Middleware `authenticateToken` com usuário padrão de desenvolvimento.
- Tabela pública `users` com `password_hash`.
- Campo `role` misturando permissão e setor, como `admin`, `contabilidade`, `fiscal` e `dp`.
- Responsável por tarefa armazenado em `tags` e empresa armazenada como texto.
- Políticas públicas de CRUD no Supabase.
- Assinatura Realtime genérica, como `public-db-sync`.

Essas hipóteses não são um diagnóstico confirmado. Se a implementação já estiver diferente ou já resolver parte do problema, aproveite-a e atualize o plano.

Identifique também tabelas e fluxos associados a tarefas: checklists, histórico, pausas, comentários, anexos, métricas e qualquer outro recurso existente. Não deixe recursos associados fora da nova regra de acesso.

Apresente uma síntese curta do estado atual, das alterações necessárias e da ordem de execução. Ao usar APIs do Supabase, confira a compatibilidade com as versões instaladas e, quando necessário, consulte a documentação oficial atual.

## 4. Arquitetura desejada

Adote Supabase Auth como autenticação única e Supabase PostgreSQL como banco oficial em produção.

O frontend poderá consultar e modificar dados diretamente pelo cliente Supabase quando as permissões e regras de negócio estiverem garantidas no banco. Centralize o acesso aos dados nos serviços ou hooks já utilizados pelo projeto, evitando consultas espalhadas sem necessidade.

Use backend confiável para operações administrativas, integrações e ações que precisem de credenciais privilegiadas. Escolha entre Express e Edge Functions conforme a estrutura existente e a solução mais simples de manter. Não duplique a mesma responsabilidade nos dois.

Se o Express ainda tiver funções úteis, mantenha-o com um papel claro. Não preserve autenticação própria e Supabase Auth em paralelo como solução definitiva.

SQLite poderá continuar como apoio a testes ou desenvolvimento isolado, se tiver utilidade real. Não implemente sincronização bidirecional com Supabase nem fallback silencioso para um banco local quando a conexão falhar. Uma indisponibilidade deve gerar um estado compreensível para o usuário, sem gravar dados em outra fonte sem transparência.

## 5. Modelo de dados

Use a estrutura abaixo como referência, adaptando nomes e campos ao projeto. Não crie tabelas duplicadas quando as existentes puderem ser migradas.

### Organizações e setores

`organizations`:

- `id`, `name`, `created_at`.

`departments`:

- `id`, `organization_id`, `name`, `description`, `active`, `created_at`.

Inicialmente haverá uma organização, a ERGON. Não implemente cobrança, planos, cadastro público de organizações ou administração de múltiplos clientes SaaS. A organização serve como limite de associação e acesso.

Os setores devem ser registros no banco, sem nomes ou quantidade fixa no código.

### Pessoas e vínculos

`profiles`:

- `id`, referenciando o identificador de `auth.users`.
- `full_name`, `avatar_url`, `active`, `created_at` e `updated_at`, se necessário.
- `email`, apenas se útil para a aplicação, definindo como evitar divergência em relação ao Auth.

As credenciais ficam no Supabase Auth. Não mantenha gerenciamento de senha na tabela pública. Planeje a retirada de `password_hash` após a transição dos usuários; não apague a estrutura legada antes de verificar suas dependências e a migração.

`organization_members`:

- `organization_id`, `user_id`, `role`, `active`, `created_at`.
- Papéis: `owner`, `admin`, `member`.
- Um único vínculo por organização e usuário.

`department_members`:

- `department_id`, `user_id`, `role`, `active`, `joined_at`.
- Papéis: `manager`, `member`.
- Um único vínculo por setor e usuário.

O papel administrativo pertence à organização; o papel de chefe pertence ao vínculo com o setor. Não crie um campo de permissão global redundante em `profiles`.

Garanta que o integrante de um setor também pertença à organização desse setor. Caso adicionar `organization_id` ao vínculo simplifique constraints e consultas, faça isso de forma consistente e justifique brevemente.

### Clientes e tarefas

`companies` representa os clientes atendidos pela ERGON e deve pertencer à organização. Preserve campos existentes, como nome e CNPJ.

`tasks` deve contemplar:

- `id`, `organization_id`, `department_id`, `company_id`.
- `title`, `description`, `assigned_to`, `created_by`.
- `status`, `priority`.
- `due_at`, `started_at`, `completed_at`, `created_at`, `updated_at`, conforme o domínio existente.

`assigned_to` e `created_by` devem referenciar pessoas por identificador. Tags continuam disponíveis para classificação, mas deixam de ser a fonte oficial do responsável. A empresa deve ser referenciada por `company_id` quando aplicável.

Defina explicitamente quais campos podem ser nulos. Uma tarefa pode ficar sem responsável, se esse estado fizer sentido no fluxo atual. Não force um cliente fictício para tarefas internas.

Preserve estados, prioridades, recorrências e funcionalidades atuais. Não altere sua semântica apenas para encaixar o modelo proposto.

Garanta no banco que organização, setor e cliente de uma tarefa sejam compatíveis. Use constraints, chaves compostas, triggers ou funções transacionais conforme apropriado; somente chaves estrangeiras independentes podem não expressar toda essa consistência.

Na atribuição ou reatribuição, valide que o responsável possui vínculo ativo com a organização e com o setor da tarefa. Preserve referências históricas se ele for desativado depois.

Crie índices coerentes com filtros por organização, setor, responsável, status e prazo, sem adicionar índices indiscriminadamente. Utilize datas e fusos de maneira compatível com a aplicação e evite deslocar prazos existentes durante a migração.

## 6. Matriz inicial de permissões

Use esta matriz como padrão inicial e documente ajustes necessários ao fluxo encontrado:

| Ação | Funcionário | Chefe do setor | Admin/owner da organização |
| --- | --- | --- | --- |
| Ver tarefas do próprio setor | Sim | Sim | Sim |
| Ver tarefas de outros setores | Apenas dos setores dos quais participa | Apenas dos setores dos quais participa | Sim, na mesma organização |
| Criar tarefa | Nos seus setores | Nos seus setores | Em qualquer setor da organização |
| Atualizar execução de tarefa atribuída a si | Sim | Sim | Sim |
| Editar qualquer tarefa de um setor | Não | Nos setores que gerencia | Sim |
| Distribuir ou reatribuir tarefas | Não | Nos setores que gerencia | Sim |
| Alterar organização ou setor de uma tarefa | Não | Não inicialmente | Sim, com validação dos vínculos |
| Excluir ou arquivar tarefa | Não inicialmente | Conforme o fluxo existente, no setor que gerencia | Sim, respeitando histórico |
| Ver métricas | Pessoais dentro dos seus setores | Dos setores que gerencia | Consolidadas da organização |
| Convidar pessoas e administrar vínculos | Não | Não inicialmente | Sim |
| Criar e administrar setores | Não | Não | Sim |
| Transferir propriedade da organização | Não | Não | Somente owner |

Por padrão, funcionário cria tarefa sem responsável. Se já houver necessidade de autoatribuição, implemente-a como regra explícita e limitada ao próprio usuário. Funcionário não atribui tarefas a outras pessoas nem ganha direito de editar qualquer tarefa só por tê-la criado.

Separe campos operacionais, como status e registros de execução, de campos de gestão, como responsável, prazo, prioridade, organização e setor. Defina claramente quais campos o funcionário pode alterar. Uma política que permite atualizar a linha inteira não deve liberar indiretamente alterações administrativas.

Use controles de coluna, triggers ou funções específicas quando necessário. `created_by` deve representar o autor real, ser validado no banco e não ser livremente regravado pelo cliente.

O acesso de admin é global dentro da sua organização. Não significa acesso a todas as organizações do banco. Proteja a continuidade administrativa: não permita remover ou desativar o último owner ativo sem transferência adequada.

## 7. RLS e autorização

Implemente isolamento com RLS nas tabelas expostas pela API. Os filtros do frontend servem para experiência e desempenho; as permissões precisam continuar válidas em chamadas diretas à API.

- Usuários não autenticados não acessam dados internos.
- Acesso exige perfil ativo e vínculo ativo com a organização; acesso setorial exige também o vínculo ativo correspondente, salvo administradores autorizados.
- Setores inativos deixam de aceitar novas operações comuns; documente como administradores consultam o histórico.
- `SELECT`, `INSERT`, `UPDATE` e `DELETE` devem ter regras explícitas quando usados.
- Nas escritas, valide também os valores novos e impeça mover registros para um escopo indevido.
- Remova políticas antigas permissivas que continuariam ampliando o acesso. Adicionar uma política restritiva isoladamente não basta quando outra ainda autoriza a operação.
- Usuários não podem promover a si mesmos, reativar a própria conta ou editar livremente os vínculos que determinam suas permissões.
- O usuário pode editar apenas os campos pessoais permitidos do próprio perfil.
- Exponha dados de colegas somente quando necessários ao trabalho e dentro do escopo autorizado. Não disponibilize todos os perfis indiscriminadamente.

Tabelas dependentes de tarefas devem respeitar o escopo da tarefa principal. Revise também views, funções de métricas, exportações e, se existirem, anexos e políticas de Storage. Não crie módulos novos apenas para cobrir recursos que o projeto não tem.

Funções auxiliares como `is_org_admin` e `is_department_member` podem simplificar as políticas. Evite recursão entre políticas de vínculos. Se usar `SECURITY DEFINER`, limite o que a função faz, fixe o `search_path`, qualifique referências e restrinja permissões de execução conforme necessário.

Use o JWT para identificar a pessoa e os vínculos no banco como fonte de autorização dinâmica. Não use `user_metadata` editável pelo usuário como fonte de privilégios. Evite depender de uma lista de setores no JWT nesta primeira versão.

## 8. Login e sessão

Implemente ou adapte:

- Login com e-mail e senha.
- Logout.
- Recuperação e redefinição de senha.
- Aceitação de convite e definição de senha.
- Carregamento inicial de sessão, perfil, organização e setores autorizados.
- Tratamento de sessão expirada, conta desativada e usuário sem vínculo válido.
- Proteção das rotas e mensagens claras de erro e carregamento.

O sistema deve funcionar por convite. Não apresente cadastro público livre. Documente a configuração correspondente no Supabase; esconder o botão de cadastro não substitui essa configuração.

Remova o usuário fixo do caminho normal de execução. Mocks devem ficar explicitamente restritos a testes ou demonstrações isoladas.

Ao sair, trocar de usuário ou trocar de setor, limpe ou invalide caches, dados sensíveis e assinaturas anteriores. Evite que a tela mostre dados de uma sessão anterior durante o carregamento.

As verificações de acesso no backend devem validar efetivamente a identidade, sem apenas decodificar um token enviado pelo navegador.

## 9. Equipe & Acessos e operações administrativas

Depois de concluir a fundação, implemente uma primeira versão simples do módulo “Equipe & Acessos”, integrada ao visual existente:

- Listar pessoas e seus vínculos.
- Criar, editar e desativar setores.
- Convidar funcionário com nome, e-mail, setor e papel no setor.
- Adicionar ou remover vínculos, inclusive participação em mais de um setor.
- Promover ou rebaixar chefe de setor.
- Desativar e reativar vínculos, exibindo usuários inativos quando solicitado.

Não construa agora um editor genérico de permissões. Os papéis definidos são suficientes.

Convites e alterações administrativas devem passar por uma operação confiável no servidor. Ela deve validar o solicitante, consultar sua autorização atual na organização, validar os dados e somente então executar a ação privilegiada.

No fluxo de convite, trate criação ou localização do usuário no Auth, perfil, vínculo com organização, vínculo com setor e auditoria. Considere conta já existente e repetição da mesma solicitação sem duplicar vínculos ou sobrescrever papéis indevidamente.

Não presuma que uma chamada ao Auth e as escritas no banco fazem parte da mesma transação. Implemente um tratamento simples para falhas parciais, com estado identificável e possibilidade de nova tentativa. Não informe sucesso completo quando apenas parte do fluxo terminou.

Defina URLs de retorno e configurações de e-mail necessárias. Desenvolva e teste o fluxo sem enviar convites reais a Bea, Vini ou outras pessoas sem autorização específica.

Permissões privilegiadas devem existir somente no servidor. No frontend, use URL e chave pública compatíveis com o SDK instalado; não exponha secret key ou `service_role` em variáveis `VITE_*`, bundle ou logs. Atualize `.env.example` somente com exemplos sem segredos.

## 10. Desativação e histórico

Prefira desativação de vínculos à exclusão de pessoas que possuem histórico.

Distinga:

- `profiles.active`: estado global da conta na aplicação.
- `organization_members.active`: acesso à organização.
- `department_members.active`: acesso a um setor.

Um administrador de organização não deve desativar globalmente uma conta que possa ter vínculos em outra organização. A ação comum deve afetar seu próprio escopo.

As permissões de novas consultas e alterações devem refletir a desativação mesmo se ainda existir um token válido. Não dependa apenas do logout no navegador. Preserve autoria, atribuições históricas e registros de execução.

Liste tarefas ainda abertas de pessoas desativadas para permitir reatribuição. Não reatribua automaticamente sem regra definida.

## 11. Empresas/clientes

Clientes pertencem à organização e podem ser atendidos por vários setores. As tarefas de cada setor continuam separadas.

Como padrão inicial, permita aos membros ativos da organização consultar o cadastro básico de clientes necessário ao trabalho. Restrinja a manutenção desse cadastro a administradores, salvo uma regra existente que justifique outra configuração.

Se houver informações específicas e reservadas de setores dentro do cadastro de clientes, separe seu acesso. Não trate o compartilhamento do cadastro básico como autorização para consultar demandas, documentos ou métricas de todos os setores.

## 12. Auditoria

Reaproveite a estrutura atual de auditoria, se existir. Caso necessário, crie `audit_logs` com:

- `id`, `organization_id`, `department_id` quando aplicável.
- `actor_user_id`, `entity_type`, `entity_id`, `action`.
- Alterações relevantes em `old_data` e `new_data`.
- `created_at`.

Registre criação de tarefas, mudança de responsável, prazo e status, além de alterações administrativas de vínculos e papéis.

Produza eventos de auditoria por mecanismos confiáveis, como triggers ou operações do backend, sem permitir que o navegador forje livremente autor e conteúdo. Restrinja leitura ao escopo autorizado e alterações diretas por usuários comuns.

Evite armazenar senhas, tokens ou cópias desnecessárias de dados pessoais. Diferencie a trilha de auditoria administrativa do histórico de tarefa exibido ao funcionário, se o produto precisar dos dois.

## 13. Realtime e uso simultâneo

Preserve o Realtime existente quando adequado e adapte as assinaturas ao contexto autorizado de organização e setor.

- Use filtros para reduzir eventos desnecessários.
- Não trate nome de canal ou filtro como mecanismo de autorização.
- Valide as garantias e limitações da modalidade usada, incluindo eventos de exclusão e mudanças de vínculo.
- Remova assinaturas ao sair ou mudar de contexto.
- Trate erro de gravação e reverta atualizações otimistas quando necessário.
- Verifique como a interface se atualiza após reconectar.
- Se houver risco concreto de sobrescrita simultânea, adote uma solução simples e documentada, como verificação de versão, sem criar sincronização complexa.

Postgres Changes pode continuar nesta etapa. Não migre para Broadcast só por uma expectativa abstrata de crescimento. Registre essa alternativa como evolução futura se fizer sentido.

## 14. Migração dos dados existentes

Faça uma transição incremental, em etapas verificáveis:

1. Identifique tabelas, dados e dependências existentes.
2. Adicione a nova estrutura e campos inicialmente compatíveis com o legado.
3. Prepare mapeamento de usuários, empresas, responsáveis e setores.
4. Execute e valide o preenchimento em ambiente de desenvolvimento.
5. Adapte os fluxos da aplicação e as políticas de acesso.
6. Aplique obrigatoriedade e constraints após resolver inconsistências.
7. Remova campos e caminhos antigos apenas depois de confirmar que não são mais usados.

Não invente uma migração automática de senha. Se não houver um caminho compatível e validado para as credenciais existentes, use convite ou redefinição de senha, com instruções claras.

Responsáveis em tags e empresas em texto exigem mapeamento explícito. Não una pessoas ou empresas só por nomes parecidos. Gere um relatório de registros ambíguos ou não mapeados e preserve a informação original até a resolução.

Não atribua automaticamente todas as demandas reais a um setor escolhido por você. Prepare parâmetros e um procedimento de execução quando faltar essa informação.

Use migrações SQL versionadas e scripts de preenchimento que possam ser retomados com segurança, quando aplicável. Não altere migrações já aplicadas em ambientes compartilhados. Documente backup, ordem de aplicação, validação e recuperação; não prometa reversão sem perda se a operação não a permitir.

## 15. Preparação inicial para Bea e Vini

Prepare um procedimento para:

1. Criar a organização ERGON.
2. Configurar o primeiro owner por um procedimento administrativo controlado.
3. Cadastrar o primeiro setor real.
4. Criar ou convidar as contas individuais de Bea e Vini.
5. Associar cada pessoa ao setor e ao papel confirmados.
6. Vincular corretamente os dados existentes.

Não invente e-mails, senhas, UUIDs reais, setor ou hierarquia. Utilize parâmetros claramente identificados no procedimento. Em testes, utilize contas fictícias isoladas, sem confundi-las com as contas de produção.

O primeiro owner não deve depender de uma rota pública de autopromoção. Explique como fazer esse provisionamento uma única vez e como evitar duplicação ao repetir o procedimento.

## 16. Interface

Mantenha a identidade visual e as funcionalidades existentes. Adapte apenas o necessário para o novo contexto:

- Exibir usuário, organização e setor ativo.
- Selecionar setor quando houver mais de um disponível.
- Restringir as opções de responsável às pessoas elegíveis.
- Funcionário visualiza as demandas dos seus setores.
- Chefe acessa a equipe e as métricas dos setores que gerencia.
- Admin visualiza o conjunto da organização e pode filtrar por setor.
- Telas sem acesso e estados vazios devem orientar o usuário de forma simples.

Não inclua detalhes de JWT, RLS ou schema nas telas voltadas ao usuário final. Esconder botões melhora a interface, mas as mesmas restrições devem valer nas operações de dados.

## 17. Testes e critérios de aceite

Use a infraestrutura de testes existente e acrescente testes que comprovem comportamento, especialmente nas permissões e migrações. Para testar RLS, use contextos reais ou simulados de usuários autenticados, sem executar tudo com uma credencial administrativa que ignora as políticas.

Valide, no mínimo:

- Usuário não autenticado não consulta dados internos.
- Funcionário do setor A não lê nem altera tarefas do setor B por chamada direta à API.
- Participante de dois setores acessa ambos, sem receber acesso a um terceiro.
- Chefe gerencia apenas os setores autorizados.
- Admin acessa sua organização, sem acesso automático a outra.
- Funcionário não altera o próprio papel, vínculos ou estado de ativação.
- Funcionário não modifica campos administrativos por um `UPDATE` direto.
- Uma tarefa não aceita cliente, setor ou responsável de escopo incompatível.
- Perfil ou vínculo desativado impede novas operações, inclusive com sessão já aberta.
- Tabelas dependentes, métricas e auditoria seguem o mesmo escopo definido.
- Convites repetidos e falhas parciais têm resultado consistente.
- Troca de sessão limpa dados e assinaturas anteriores.
- A migração preserva quantidades e relações relevantes e identifica pendências de mapeamento.
- Kanban, calendário e demais fluxos encontrados continuam funcionando para usuários autorizados.

Execute build, lint, verificação de tipos e testes disponíveis conforme as ferramentas do projeto. Corrija regressões causadas pelas alterações. Não declare como executados testes que dependam de serviços indisponíveis.

Inclua um roteiro manual com duas sessões independentes para validar colaboração no mesmo setor e isolamento entre setores. Diferencie os testes automatizados concluídos das verificações manuais ainda necessárias.

## 18. Ordem de execução e limite de escopo

Execute em blocos coerentes, mantendo o projeto verificável:

0. Confirmar `release-login-nov`, a base de trabalho e o isolamento do ambiente de desenvolvimento.
1. Inspeção e plano curto.
2. Modelo de dados e migrações.
3. Supabase Auth, sessão e provisionamento inicial.
4. RLS, permissões e adaptação dos serviços de dados.
5. Tarefas, clientes, telas existentes e Realtime.
6. Versão inicial de Equipe & Acessos, convites e auditoria.
7. Testes, revisão e documentação.

A fundação tem prioridade, mas o escopo inclui a primeira versão administrativa descrita acima. Prossiga até completá-la, salvo impedimentos concretos. Se uma configuração externa impedir a execução de um fluxo, entregue sua implementação e indique exatamente o que falta para ativá-lo.

Deixe para evolução futura: editor genérico de permissões, cobrança SaaS, provisionamento público de organizações, integrações WhatsApp, processamento pesado, mudança de infraestrutura de Realtime sem necessidade demonstrada e novos módulos de comentários ou convites persistidos que não sejam necessários ao fluxo básico.

Não crie microsserviços, filas, event sourcing ou um framework próprio de autorização para resolver esse cenário. Se já existir algum desses elementos, avalie sua utilidade sem removê-lo automaticamente.

## 19. Entrega e comunicação

Ao finalizar, entregue:

- Código implementado e integrado à estrutura atual.
- Migrações e scripts necessários, com procedimento para dados legados.
- `.env.example` e documentação de configuração atualizados.
- Matriz final de permissões e descrição curta da arquitetura adotada.
- Instruções para configurar Auth, convites, URLs de retorno e o primeiro owner.
- Procedimento para cadastrar Bea, Vini e os setores quando os dados reais forem informados.
- Resultado dos testes, limitações comprovadas e verificações pendentes.
- Acompanhamento das etapas na branch `release-login-nov` e roteiro de lançamento para novembro de 2026, sem executar merge ou publicação em produção.

No resumo final, explique o que mudou, o que já funciona, como foi validado e o que depende de configuração externa. Cite os arquivos principais e comandos úteis, sem transformar a resposta em um relatório excessivamente longo.

Mantenha o tom técnico e tranquilo. Prefira explicações concretas, como “esta política permite consultas sem autenticação; foi substituída por acesso por vínculo”, a alertas genéricos ou exagerados.

Comece inspecionando o repositório, prepare ou retome `release-login-nov`, confirme o isolamento do ambiente e avance com a implementação por etapas. Preserve a `main` e a produção durante todo esse trabalho.
