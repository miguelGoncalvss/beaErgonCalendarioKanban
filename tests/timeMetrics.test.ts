import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateElapsedSeconds,
  calculateBusinessSeconds,
  formatBusinessDuration,
  formatDuration,
  createHandoffTransition,
  getTaskAssigneeAudit,
  BUSINESS_HOURS,
} from '../src/utils/timeMetrics.ts';
import type { Task } from '../src/types/index.ts';

describe('Baseline de Cálculos de Tempo e Horário Comercial (Seg-Sex, 08h-17h)', () => {
  it('calculateElapsedSeconds deve calcular segundos corridos 24h/7d corretamente', () => {
    const start = '2026-09-28T10:00:00.000Z';
    const end = '2026-09-28T12:30:00.000Z';
    // 2h30 = 2 * 3600 + 30 * 60 = 7200 + 1800 = 9000s
    assert.equal(calculateElapsedSeconds(start, end), 9000);

    // Datas invertidas ou ausentes devem retornar 0
    assert.equal(calculateElapsedSeconds(end, start), 0);
    assert.equal(calculateElapsedSeconds(undefined, end), 0);
    assert.equal(calculateElapsedSeconds(start, null), 0);
  });

  it('calculateBusinessSeconds deve desconsiderar fins de semana integralmente', () => {
    // Sábado 26/09/2026 às 10:00 até Domingo 27/09/2026 às 15:00
    const saturday = '2026-09-26T10:00:00.000';
    const sunday = '2026-09-27T15:00:00.000';
    assert.equal(calculateBusinessSeconds(saturday, sunday), 0);
  });

  it('calculateBusinessSeconds deve computar estritamente a janela das 08h às 17h em dias úteis', () => {
    // Sexta-feira 25/09/2026 das 08:00 às 17:00 (9 horas de expediente = 32.400 segundos)
    const startFriday = '2026-09-25T08:00:00.000';
    const endFriday = '2026-09-25T17:00:00.000';
    const seconds = calculateBusinessSeconds(startFriday, endFriday);
    assert.equal(seconds, BUSINESS_HOURS.dailyHours * 3600); // 32.400s

    // Intervalo parcial: 10:00 às 12:30 no mesmo dia (2h30 = 9.000 segundos)
    const partialStart = '2026-09-25T10:00:00.000';
    const partialEnd = '2026-09-25T12:30:00.000';
    assert.equal(calculateBusinessSeconds(partialStart, partialEnd), 9000);

    // Trabalho fora do expediente (noite, ex: 18:00 às 22:00) deve dar 0 segundos úteis
    const nightStart = '2026-09-25T18:00:00.000';
    const nightEnd = '2026-09-25T22:00:00.000';
    assert.equal(calculateBusinessSeconds(nightStart, nightEnd), 0);
  });

  it('calculateBusinessSeconds cruzando fim de semana (Sexta 16h até Segunda 10h)', () => {
    // Sexta 25/09/2026 às 16:00 (1 hora útil até 17:00 = 3600s)
    // Sábado e Domingo: 0s
    // Segunda 28/09/2026 das 08:00 às 10:00 (2 horas úteis = 7200s)
    // Total esperado: 3600 + 7200 = 10.800s (3 horas úteis)
    const fridayLate = '2026-09-25T16:00:00.000';
    const mondayMorning = '2026-09-28T10:00:00.000';
    const total = calculateBusinessSeconds(fridayLate, mondayMorning);
    assert.equal(total, 10800);
  });

  it('formatBusinessDuration deve formatar em dias úteis (9h/dia) e horas', () => {
    assert.equal(formatBusinessDuration(0), '0m');
    assert.equal(formatBusinessDuration(3600), '1h');
    assert.equal(formatBusinessDuration(5400), '1h 30m');
    // 1 dia útil (32400s) + 2h (7200s) = 39600s -> "1d útil 2h"
    assert.equal(formatBusinessDuration(39600), '1d útil 2h');
    // 2 dias úteis (64800s) -> "2d útils" (formato legado atual)
    assert.equal(formatBusinessDuration(64800), '2d útils');
  });

  it('formatDuration deve formatar tempo corrido (24h/dia)', () => {
    assert.equal(formatDuration(0), '0m');
    assert.equal(formatDuration(3600), '1h');
    // 24 horas = 86400s -> "1d"
    assert.equal(formatDuration(86400), '1d');
    // 26 horas = 93600s -> "1d 2h"
    assert.equal(formatDuration(93600), '1d 2h');
  });
});

describe('Baseline de Passagem de Bastão e Auditoria de Responsabilidade (Bea & Vini)', () => {
  it('createHandoffTransition deve registrar a transição e calcular duração anterior', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Conciliação Bancária',
      status: 'in_progress',
      priority: 'high',
      createdAt: '2026-09-25T08:00:00.000',
      assignee: 'Bea',
      assigneeHistory: [
        {
          id: 'trans-1',
          assignee: 'Bea',
          enteredAt: '2026-09-25T08:00:00.000',
          action: 'created',
        },
      ],
    };

    // Passagem de bastão para Vini às 11:00 da mesma Sexta
    const nowIso = '2026-09-25T11:00:00.000';
    const updatedHistory = createHandoffTransition(task, 'Vini', nowIso);

    assert.equal(updatedHistory.length, 2);

    // Primeira transição (Bea) deve ter sido encerrada às 11:00
    const beaTrans = updatedHistory[0];
    assert.equal(beaTrans.leftAt, nowIso);
    assert.equal(beaTrans.durationSeconds, 3 * 3600); // 3 horas
    assert.equal(beaTrans.businessSeconds, 3 * 3600); // 3 horas úteis

    // Nova transição (Vini) deve começar ativa
    const viniTrans = updatedHistory[1];
    assert.equal(viniTrans.assignee, 'Vini');
    assert.equal(viniTrans.transferredFrom, 'Bea');
    assert.equal(viniTrans.enteredAt, nowIso);
    assert.equal(viniTrans.action, 'transferred');
    assert.equal(viniTrans.leftAt, undefined);
  });

  it('calculateAssigneeAudit deve consolidar tempos úteis e corridos por operador', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Fechamento Fiscal',
      status: 'done',
      priority: 'medium',
      createdAt: '2026-09-25T08:00:00.000',
      assignee: 'Vini',
      assigneeHistory: [
        {
          id: 'trans-1',
          assignee: 'Bea',
          enteredAt: '2026-09-25T08:00:00.000',
          leftAt: '2026-09-25T11:00:00.000',
          durationSeconds: 10800,
          businessSeconds: 10800,
          action: 'created',
        },
        {
          id: 'trans-2',
          assignee: 'Vini',
          transferredFrom: 'Bea',
          enteredAt: '2026-09-25T11:00:00.000',
          leftAt: '2026-09-25T13:00:00.000',
          durationSeconds: 7200,
          businessSeconds: 7200,
          action: 'transferred',
        },
      ],
    };

    const audit = getTaskAssigneeAudit(task);
    assert.equal(audit.bea.businessSeconds, 10800); // 3h
    assert.equal(audit.vini.businessSeconds, 7200); // 2h
    // 2 eventos de transferência + 1 evento sintetizado de conclusão para tarefas 'done'
    assert.equal(audit.history.length, 3);
    assert.equal(audit.history[2].action, 'completed');
  });
});
