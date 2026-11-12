(function () {
  'use strict';
  if (!document.getElementById('app')) return;

  const text = value => String(value ?? '');
  const api = () => window.KDS?.teamApi;
  const rows = key => {
    try { return Array.isArray(window.load?.(key, [])) ? window.load(key, []) : []; }
    catch (_) { return []; }
  };
  const remote = async (table, query = '') => {
    try { return await api().request('/rest/v1/' + table + '?select=*' + (query ? '&' + query : '')); }
    catch (_) { return []; }
  };

  function flatten(record) {
    const out = {};
    for (const [key, value] of Object.entries(record || {})) {
      if (/password|secret|token|credential|key/i.test(key)) continue;
      if (Array.isArray(value)) out[key] = value.map(item => typeof item === 'object' ? JSON.stringify(item) : text(item)).join('; ');
      else if (value && typeof value === 'object') out[key] = JSON.stringify(value);
      else out[key] = value;
    }
    return out;
  }

  async function exportXLSX() {
    const trigger = document.getElementById('v8ExportXlsx');
    if (trigger?.disabled) return;
    trigger.disabled = true;
    trigger.setAttribute('aria-busy', 'true');
    try {
      await api().check();
      const [team, jobs, updates, conversations, notifications, audit] = await Promise.all([
        remote('kds_team', 'order=created_at.asc'), remote('kds_jobs', 'order=created_at.asc'),
        remote('kds_job_updates', 'order=created_at.asc'), remote('kds_project_messages', 'order=created_at.asc'),
        remote('kds_notifications', 'order=created_at.asc'), remote('kds_audit_events', 'order=created_at.asc')
      ]);
      const datasets = {
        Leads: rows(window.K?.leads).map(flatten),
        Projects: rows(window.K?.projects).map(flatten),
        Clients: rows(window.K?.clients).map(flatten),
        Inbox: rows(window.K?.msgs).map(flatten),
        Team: team.map(flatten),
        Jobs: jobs.map(flatten),
        Checkpoints: updates.map(flatten),
        Conversations: conversations.map(flatten),
        Notifications: notifications.map(flatten),
        'Audit log': audit.map(flatten)
      };
      window.KDSXLSX.exportWorkbook(datasets, {
        filename: 'khanya-digital-report-' + new Date().toISOString().slice(0, 10) + '.xlsx',
        title: 'Khanya Digital Studio reporting export',
        timezone: 'Africa/Johannesburg'
      });
      window.toast?.('Excel report exported. This is a reporting file, not a database backup.');
    } catch (error) {
      window.toast?.(error?.message || 'The Excel report could not be exported.');
    } finally {
      trigger.disabled = false;
      trigger.removeAttribute('aria-busy');
    }
  }
  window.exportXLSX = exportXLSX;

  function mount() {
    const csv = [...document.querySelectorAll('button')].find(button => /export csv/i.test(button.textContent));
    if (csv && !document.getElementById('v8ExportXlsx')) {
      const button = document.createElement('button');
      button.id = 'v8ExportXlsx';
      button.type = 'button';
      button.className = 'btn gh sm';
      button.textContent = 'Export Excel';
      button.onclick = exportXLSX;
      csv.after(button);
    }
    const snapshot = [...document.querySelectorAll('button')].find(button => /download backup/i.test(button.textContent));
    if (snapshot) {
      snapshot.textContent = 'Download JSON snapshot';
      const card = snapshot.closest('.card');
      const copy = card?.querySelector('p');
      if (copy) copy.textContent = 'Download the records visible to this owner session. This JSON snapshot is useful for review, but it is not a complete or directly restorable Supabase backup.';
      if (card && !card.querySelector('.v8-backup-note')) {
        const note = document.createElement('p');
        note.className = 'v8-backup-note';
        note.textContent = 'Use the documented Supabase database export process for a restorable backup.';
        card.append(note);
      }
    }
  }
  document.addEventListener('DOMContentLoaded', mount);
})();
