import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getWorkloadSummary } from '../src/utils/workloadUtils.ts';
import { createHandoffTransition, getTaskAssigneeAudit } from '../src/utils/timeMetrics.ts';
import type { Task } from '../src/types/index.ts';

describe('Gestão Dinâmica de Carga de Trabalho & Chefes de Setor (Expansão Multi-Operador)', () => {
  it('deve calcular estatísticas para múltiplos operadores conhecidos e chefes de setor', () => {
    const tasks: Task[] = [
      {
        id: 't-1',
        title: 'Fechamento Fiscal Empresa A',
        status: 'in_progress',
        priority: 'high',
        assignee: 'Bea',
        createdAt: '2026-09-25T08:00:00.000',
      },
      {
        id: 't-2',
        title: 'Conciliação Bancária Empresa B',
        status: 'todo',
        priority: 'medium',
        assignee: 'Vini',
        createdAt: '2026-09-25T09:00:00.000',
      },
      {
        id: 't-3',
        title: 'Revisão Tributária Empresa C',
        status: 'in_progress',
        priority: 'urgent',
        assignee: 'Carlos Fiscal',
        createdAt: '2026-09-25T10:00:00.000',
      },
      {
        id: 't-4',
        title: 'Folha de Pagamento Empresa D',
        status: 'done',
        priority: 'high',
        assignee: 'Carlos Fiscal',
        createdAt: '2026-09-25T07:00:00.000',
      },
      {
        id: 't-5',
        title: 'Auditoria Setorial Empresa E',
        status: 'delayed',
        priority: 'urgent',
        assignee: 'Marina DP',
        createdAt: '2026-09-25T08:30:00.000',
      },
    ];

    const knownOperators = [
      {
        name: 'Carlos Fiscal',
        displayName: 'Carlos Eduardo',
        roleTitle: 'Chefe de Setor (Fiscal)',
        departmentName: 'Fiscal',
      },
      {
        name: 'Marina DP',
        displayName: 'Marina Silva',
        roleTitle: 'Chefe de Setor (Departamento Pessoal)',
        departmentName: 'Departamento Pessoal',
      },
    ];

    const summary = getWorkloadSummary(tasks, { knownOperators });

    // Total de ativas: t-1 (Bea), t-2 (Vini), t-3 (Carlos), t-5 (Marina) = 4 ativas
    assert.equal(summary.totalActive, 4);
    assert.equal(summary.totalCompleted, 1);

    // Deve conter operadores Bea, Vini, Carlos Fiscal, Marina DP
    const carlos = summary.operators.find((o) => o.operator === 'Carlos Fiscal');
    assert.ok(carlos, 'Carlos Fiscal deve estar presente na lista de operadores');
    assert.equal(carlos?.displayName, 'Carlos Eduardo');
    assert.equal(carlos?.roleTitle, 'Chefe de Setor (Fiscal)');
    assert.equal(carlos?.totalActive, 1);
    assert.equal(carlos?.completedCount, 1);
    assert.equal(carlos?.inProgressCount, 1);

    const marina = summary.operators.find((o) => o.operator === 'Marina DP');
    assert.ok(marina, 'Marina DP deve estar presente na lista de operadores');
    assert.equal(marina?.roleTitle, 'Chefe de Setor (Departamento Pessoal)');
    assert.equal(marina?.totalActive, 1);
    assert.equal(marina?.delayedCount, 1);

    // Compatibilidade retrógrada com Bea e Vini mantida
    assert.equal(summary.bea.totalActive, 1);
    assert.equal(summary.vini.totalActive, 1);
  });

  it('deve realizar passagem de bastão contínua entre múltiplos operadores e chefes de setor', () => {
    const task: Task = {
      id: 'task-flow',
      title: 'Abertura de Filial e Alvará',
      status: 'in_progress',
      priority: 'high',
      createdAt: '2026-09-25T08:00:00.000',
      assignee: 'Bea',
      assigneeHistory: [
        {
          id: 'step-1',
          assignee: 'Bea',
          enteredAt: '2026-09-25T08:00:00.000',
          action: 'created',
        },
      ],
    };

    // 1. Bea passa o bastão para Chefe Fiscal (Carlos) às 10:00
    const h1 = createHandoffTransition(task, 'Carlos Fiscal', '2026-09-25T10:00:00.000');
    task.assignee = 'Carlos Fiscal';
    task.assigneeHistory = h1;

    // 2. Carlos passa o bastão para Operadora DP (Marina) às 14:00
    const h2 = createHandoffTransition(task, 'Marina DP', '2026-09-25T14:00:00.000');
    task.assignee = 'Marina DP';
    task.assigneeHistory = h2;

    assert.equal(task.assigneeHistory.length, 3);
    assert.equal(task.assigneeHistory[0].assignee, 'Bea');
    assert.equal(task.assigneeHistory[0].leftAt, '2026-09-25T10:00:00.000');
    assert.equal(task.assigneeHistory[0].businessSeconds, 2 * 3600); // 08:00 às 10:00 = 2h

    assert.equal(task.assigneeHistory[1].assignee, 'Carlos Fiscal');
    assert.equal(task.assigneeHistory[1].transferredFrom, 'Bea');
    assert.equal(task.assigneeHistory[1].leftAt, '2026-09-25T14:00:00.000');
    assert.equal(task.assigneeHistory[1].businessSeconds, 4 * 3600); // 10:00 às 14:00 = 4h

    assert.equal(task.assigneeHistory[2].assignee, 'Marina DP');
    assert.equal(task.assigneeHistory[2].transferredFrom, 'Carlos Fiscal');
    assert.equal(task.assigneeHistory[2].enteredAt, '2026-09-25T14:00:00.000');
    assert.equal(task.assigneeHistory[2].leftAt, undefined);

    // Auditoria consolidada por operador
    const audit = getTaskAssigneeAudit(task);
    assert.equal(audit.byAssignee['Bea']?.businessSeconds, 7200);
    assert.equal(audit.byAssignee['Carlos Fiscal']?.businessSeconds, 14400);
    assert.ok(audit.byAssignee['Marina DP']);
  });
});
