import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

function emptyTaskForm() {
  return { field_key: '', perspective_key: '', task_type: 'pflicht', question_1: '', question_2: '', questions_extra: [] };
}

function TaskForm({ initial, fields, perspectives, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyTaskForm());

  function updateExtra(i, value) {
    const next = [...form.questions_extra];
    next[i] = value;
    setForm({ ...form, questions_extra: next });
  }
  function addExtra() {
    setForm({ ...form, questions_extra: [...form.questions_extra, ''] });
  }
  function removeExtra(i) {
    setForm({ ...form, questions_extra: form.questions_extra.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="panel" style={{ padding: 16, marginBottom: 10 }}>
      <div className="flex gap-8">
        <div className="field-group" style={{ flex: 1 }}>
          <label className="field-label">Feld (BMC)</label>
          <select className="select" value={form.field_key} onChange={(e) => setForm({ ...form, field_key: e.target.value })}>
            <option value="" disabled>— wählen —</option>
            {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
        <div className="field-group" style={{ flex: 1 }}>
          <label className="field-label">Perspektive / Ebene</label>
          <select className="select" value={form.perspective_key} onChange={(e) => setForm({ ...form, perspective_key: e.target.value })}>
            <option value="" disabled>— wählen —</option>
            {perspectives.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div className="field-group" style={{ flex: 1 }}>
          <label className="field-label">Pflicht / Wahl</label>
          <select className="select" value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
            <option value="pflicht">Pflicht</option>
            <option value="optional">Wahl</option>
          </select>
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">Frage 1</label>
        <textarea className="textarea" rows={2} value={form.question_1} onChange={(e) => setForm({ ...form, question_1: e.target.value })} />
      </div>
      <div className="field-group">
        <label className="field-label">Frage 2</label>
        <textarea className="textarea" rows={2} value={form.question_2} onChange={(e) => setForm({ ...form, question_2: e.target.value })} />
      </div>
      {form.questions_extra.map((q, i) => (
        <div className="field-group" key={i}>
          <label className="field-label">Weitere Frage {i + 3}</label>
          <div className="flex gap-8">
            <textarea className="textarea" rows={2} style={{ flex: 1 }} value={q} onChange={(e) => updateExtra(i, e.target.value)} />
            <button className="btn btn-danger btn-sm" onClick={() => removeExtra(i)}>Entfernen</button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={addExtra}>+ Weitere Frage</button>

      <div className="flex gap-8 mt-16">
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Abbrechen</button>
        <button className="btn btn-accent btn-sm" onClick={() => onSave(form)}>Speichern</button>
      </div>
    </div>
  );
}

export default function ModulesManage() {
  const [modules, setModules] = useState([]);
  const [reference, setReference] = useState({ fields: [], perspectives: [] });
  const [expandedModule, setExpandedModule] = useState(null);
  const [editingTask, setEditingTask] = useState(null); // { moduleId, task | null }
  const [editingModuleMeta, setEditingModuleMeta] = useState(null);
  const [newModule, setNewModule] = useState({ number: '', title: '', subtitle: '', description: '' });
  const [showNewModule, setShowNewModule] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [m, ref] = await Promise.all([
      api.get('/admin/modules'),
      api.get('/admin/reference'),
    ]);
    setModules(m);
    setReference(ref);
  }
  useEffect(() => { load(); }, []);

  async function createModule(e) {
    e.preventDefault();
    if (!newModule.title.trim()) return;
    setError('');
    try {
      await api.post('/admin/modules', {
        number: newModule.number ? Number(newModule.number) : null,
        title: newModule.title,
        subtitle: newModule.subtitle,
        description: newModule.description,
      });
      setNewModule({ number: '', title: '', subtitle: '', description: '' });
      setShowNewModule(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteModule(m) {
    if (!window.confirm(`Modul „${m.title}" wirklich vollständig löschen?`)) return;
    try {
      await api.del(`/admin/modules/${m.id}`);
      await load();
    } catch (err) {
      if (err.message) {
        const wantsDeactivate = window.confirm(`${err.message}\n\nStattdessen deaktivieren?`);
        if (wantsDeactivate) {
          try {
            await api.patch(`/admin/modules/${m.id}`, { is_active: false });
            await load();
          } catch (err2) {
            alert(`Deaktivieren fehlgeschlagen: ${err2.message}`);
          }
        }
      }
    }
  }

  async function toggleModuleActive(m) {
    try {
      await api.patch(`/admin/modules/${m.id}`, { is_active: !m.is_active });
      await load();
    } catch (err) {
      alert(`Fehler beim Ändern des Status: ${err.message}`);
    }
  }

  async function saveModuleMeta(m, meta) {
    await api.patch(`/admin/modules/${m.id}`, meta);
    setEditingModuleMeta(null);
    await load();
  }

  async function saveTask(moduleId, task, form) {
    const payload = {
      field_key: form.field_key,
      perspective_key: form.perspective_key,
      task_type: form.task_type,
      question_1: form.question_1,
      question_2: form.question_2,
      questions_extra: form.questions_extra.filter((q) => q.trim()),
    };
    try {
      if (task) {
        if (task.has_postits) {
          const confirmed = window.confirm(
            'Diese Kachel wurde bereits von Organisationen beantwortet. Die Änderung wirkt sich für alle zugewiesenen Organisationen aus. Fortfahren?'
          );
          if (!confirmed) return;
          payload.confirmed = true;
        }
        await api.patch(`/admin/module-tasks/${task.id}`, payload);
      } else {
        await api.post(`/admin/modules/${moduleId}/tasks`, payload);
      }
      setEditingTask(null);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm('Diese Kachel wirklich löschen?')) return;
    try {
      await api.del(`/admin/module-tasks/${task.id}`);
      await load();
    } catch (err) {
      const wantsDeactivate = window.confirm(`${err.message}\n\nStattdessen deaktivieren?`);
      if (wantsDeactivate) {
        await api.patch(`/admin/module-tasks/${task.id}`, { is_active: false });
        await load();
      }
    }
  }

  async function toggleTaskActive(task) {
    try {
      await api.patch(`/admin/module-tasks/${task.id}`, { is_active: !task.is_active });
      await load();
    } catch (err) {
      alert(`Fehler beim Ändern des Status: ${err.message}`);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Module verwalten</h1>
        <p className="page-lede">
          Lege Module und ihre Pflicht-/Wahlkacheln an, bearbeite sie oder deaktiviere sie. Bereits von
          Organisationen beantwortete Kacheln bleiben beim Deaktivieren oder Ändern für diese unangetastet erhalten.
        </p>
      </div>

      <div className="panel">
        <div className="flex justify-between items-center">
          <div className="section-title" style={{ marginBottom: 0 }}>Neues Modul</div>
          <button className="btn btn-accent btn-sm" onClick={() => setShowNewModule((s) => !s)}>
            {showNewModule ? 'Schließen' : '+ Modul hinzufügen'}
          </button>
        </div>
        {showNewModule && (
          <form onSubmit={createModule} className="mt-16">
            <div className="flex gap-8">
              <div className="field-group" style={{ width: 120 }}>
                <label className="field-label">Nummer</label>
                <input className="text-input" type="number" value={newModule.number} onChange={(e) => setNewModule({ ...newModule, number: e.target.value })} placeholder="17" />
              </div>
              <div className="field-group" style={{ flex: 1 }}>
                <label className="field-label">Titel</label>
                <input className="text-input" value={newModule.title} onChange={(e) => setNewModule({ ...newModule, title: e.target.value })} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Unterüberschrift</label>
              <input className="text-input" value={newModule.subtitle} onChange={(e) => setNewModule({ ...newModule, subtitle: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field-label">Kurzbeschreibung</label>
              <textarea className="textarea" rows={2} value={newModule.description} onChange={(e) => setNewModule({ ...newModule, description: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-sm">Anlegen</button>
            {error && <div className="error-text mt-8">{error}</div>}
          </form>
        )}
      </div>

      <div className="panel">
        <div className="section-title">Modul-Datenbank ({modules.length})</div>
        {modules.map((m) => {
          const isOpen = expandedModule === m.id;
          const isEditingMeta = editingModuleMeta === m.id;
          return (
            <div key={m.id} style={{ borderTop: '1px solid var(--line)', padding: '14px 0', opacity: m.is_active ? 1 : 0.6 }}>
              {isEditingMeta ? (
                <ModuleMetaForm module={m} onSave={(meta) => saveModuleMeta(m, meta)} onCancel={() => setEditingModuleMeta(null)} />
              ) : (
                <div className="flex justify-between items-center">
                  <div style={{ flex: 1 }}>
                    <div className="flex gap-8 items-center">
                      {m.number && <span className="badge badge-optional">Modul {m.number}</span>}
                      <span style={{ fontWeight: 700 }}>{m.title}</span>
                      {!m.is_active && <span className="badge badge-optional">deaktiviert</span>}
                    </div>
                    <div className="small muted mt-8">{m.subtitle}</div>
                  </div>
                  <div className="flex gap-8">
                    <button className="btn btn-ghost btn-sm" onClick={() => setExpandedModule(isOpen ? null : m.id)}>
                      {isOpen ? 'Schließen' : 'Details'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingModuleMeta(m.id)}>Bearbeiten</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleModuleActive(m)}>
                      {m.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteModule(m)}>Löschen</button>
                  </div>
                </div>
              )}

              {isOpen && (
                <div style={{ marginTop: 14, background: 'var(--paper-tint)', padding: 16, borderRadius: 4 }}>
                  {m.tasks.map((t) => (
                    editingTask?.task?.id === t.id ? (
                      <TaskForm
                        key={t.id}
                        initial={{
                          field_key: t.field_key, perspective_key: t.perspective_key, task_type: t.task_type,
                          question_1: t.question_1 || '', question_2: t.question_2 || '',
                          questions_extra: Array.isArray(t.questions_extra) ? t.questions_extra : [],
                        }}
                        fields={reference.fields}
                        perspectives={reference.perspectives}
                        onSave={(form) => saveTask(m.id, t, form)}
                        onCancel={() => setEditingTask(null)}
                      />
                    ) : (
                      <div key={t.id} className="panel" style={{ marginBottom: 10, padding: 14, opacity: t.is_active ? 1 : 0.6 }}>
                        <div className="flex justify-between items-center">
                          <div className="flex gap-8 items-center">
                            <span className={`badge ${t.task_type === 'pflicht' ? 'badge-pflicht' : 'badge-optional'}`}>
                              {t.task_type === 'pflicht' ? 'Pflicht' : 'Wahl'}
                            </span>
                            <span className="dot" style={{ background: t.color_hex }} />
                            <span className="small muted">{t.perspective_label}</span>
                            <span style={{ fontWeight: 700, marginLeft: 4 }}>{t.field_label}</span>
                            {!t.is_active && <span className="badge badge-optional">deaktiviert</span>}
                            {t.has_postits && <span className="small muted">· bereits beantwortet</span>}
                          </div>
                          <div className="flex gap-8">
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingTask({ moduleId: m.id, task: t })}>Bearbeiten</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => toggleTaskActive(t)}>
                              {t.is_active ? 'Deaktivieren' : 'Aktivieren'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteTask(t)}>Löschen</button>
                          </div>
                        </div>
                        {t.question_1 && <p className="small mt-8">→ {t.question_1}</p>}
                        {t.question_2 && <p className="small mt-8">→ {t.question_2}</p>}
                        {(t.questions_extra || []).map((q, i) => <p className="small mt-8" key={i}>→ {q}</p>)}
                      </div>
                    )
                  ))}

                  {editingTask?.moduleId === m.id && !editingTask.task && (
                    <TaskForm
                      fields={reference.fields}
                      perspectives={reference.perspectives}
                      onSave={(form) => saveTask(m.id, null, form)}
                      onCancel={() => setEditingTask(null)}
                    />
                  )}

                  {!(editingTask?.moduleId === m.id && !editingTask.task) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingTask({ moduleId: m.id, task: null })}>
                      + Kachel hinzufügen
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModuleMetaForm({ module, onSave, onCancel }) {
  const [title, setTitle] = useState(module.title);
  const [subtitle, setSubtitle] = useState(module.subtitle || '');
  const [description, setDescription] = useState(module.description || '');
  return (
    <div>
      <div className="field-group">
        <label className="field-label">Titel</label>
        <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field-group">
        <label className="field-label">Unterüberschrift</label>
        <input className="text-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </div>
      <div className="field-group">
        <label className="field-label">Kurzbeschreibung</label>
        <textarea className="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex gap-8">
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Abbrechen</button>
        <button className="btn btn-accent btn-sm" onClick={() => onSave({ title, subtitle, description })}>Speichern</button>
      </div>
    </div>
  );
}
