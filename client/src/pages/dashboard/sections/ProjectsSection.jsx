import React, { useState, useEffect } from 'react';
import { Briefcase, Eye, Edit, CheckCircle, Clock, Building, Network } from 'lucide-react';
import { fetchJSON } from 'services/api';

const statusConfig = {
  'neu': {
    label: 'Neu',
    bgClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: Clock
  },
  'in Arbeit': {
    label: 'In Arbeit',
    bgClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: Clock
  },
  'erledigt': {
    label: 'Erledigt',
    bgClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: CheckCircle
  }
};

export default function ProjectsSection({ isDark, customers = [], loading, onRefreshData }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState({});

  // ✨ Edit-Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    onboarding_id: null,
    status: 'neu',
    datum: '',
    mitarbeiter_id: '',
    infrastructure_data: '{}',
  });

  const classes = {
    bgClass: isDark ? 'bg-gray-800' : 'bg-white',
    borderClass: isDark ? 'border-gray-700' : 'border-gray-200',
    textClass: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondaryClass: isDark ? 'text-gray-300' : 'text-gray-700',
    textMutedClass: isDark ? 'text-gray-400' : 'text-gray-500',
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Projekte laden
  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const data = await fetchJSON('/onboarding/projects');
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Nur Status schnell ändern (Badges/Buttons)
  const updateStatus = async (onboardingId, newStatus) => {
    setStatusLoading(prev => ({ ...prev, [onboardingId]: true }));
    try {
      await fetchJSON(`/onboarding/${onboardingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      // Lokalen State updaten
      setProjects(prev => prev.map(p =>
        p.onboarding_id === onboardingId ? { ...p, status: newStatus } : p
      ));

      if (onRefreshData) await onRefreshData();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      alert(`Fehler beim Aktualisieren: ${error.message}`);
    } finally {
      setStatusLoading(prev => ({ ...prev, [onboardingId]: false }));
    }
  };

  // Kundennamen lookup
  const getCustomerName = (kundeId) => {
    const customer = customers.find(c => Number(c.kunden_id) === Number(kundeId));
    return customer?.firmenname || 'Unbekannt';
  };

  // 🔎 Bearbeiten öffnen: Details laden + Modal öffnen
  const openEdit = async (project) => {
    try {
      setEditLoading(true);
      const data = await fetchJSON(`/onboarding/${project.onboarding_id}`);

      setEditForm({
        onboarding_id: data.onboarding_id,
        status: data.status || 'neu',
        datum: data.datum || new Date().toISOString().slice(0, 10),
        mitarbeiter_id: data.mitarbeiter_id ?? '',
        infrastructure_data: JSON.stringify(data.infrastructure_data || {}, null, 2),
      });

      setEditOpen(true);
    } catch (e) {
      console.error('Fehler beim Laden der Projektdetails:', e);
      alert(`Fehler beim Laden der Projektdetails: ${e.message || e}`);
    } finally {
      setEditLoading(false);
    }
  };

  // 💾 Bearbeiten speichern
  const saveEdit = async () => {
    try {
      setSaveLoading(true);

      let infraParsed = {};
      try {
        infraParsed = editForm.infrastructure_data ? JSON.parse(editForm.infrastructure_data) : {};
      } catch (e) {
        alert('Infrastruktur-Daten sind kein gültiges JSON.');
        setSaveLoading(false);
        return;
      }

      const body = {
        status: editForm.status,
        datum: editForm.datum, // YYYY-MM-DD
        mitarbeiter_id: editForm.mitarbeiter_id === '' ? null : Number(editForm.mitarbeiter_id),
        infrastructure_data: infraParsed,
      };

      const updated = await fetchJSON(`/onboarding/${editForm.onboarding_id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      // Liste aktualisieren (Status/Datum fallen hier am meisten auf)
      setProjects(prev => prev.map(p =>
        p.onboarding_id === updated.onboarding_id
          ? { ...p, status: updated.status, created_at: updated.created_at }
          : p
      ));

      if (onRefreshData) await onRefreshData();

      setEditOpen(false);
      alert('Änderungen gespeichert ✅');
    } catch (e) {
      console.error('Fehler beim Speichern:', e);
      alert(`Fehler beim Speichern: ${e.message || e}`);
    } finally {
      setSaveLoading(false);
    }
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={classes.textMutedClass}>Lade Projekte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-semibold ${classes.textClass} mb-2`}>
            IT-Projekte
          </h2>
          <p className={classes.textMutedClass}>
            {projects.length} Projekte insgesamt
          </p>
        </div>
        <button
          onClick={loadProjects}
          disabled={projectsLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Aktualisieren
        </button>
      </div>

      {projects.length === 0 ? (
        <div className={`${classes.bgClass} ${classes.borderClass} rounded-lg shadow-sm border p-12 text-center`}>
          <Briefcase className={`w-16 h-16 ${classes.textMutedClass} mx-auto mb-4`} />
          <h3 className={`text-lg font-medium ${classes.textClass} mb-2`}>
            Keine Projekte vorhanden
          </h3>
          <p className={classes.textMutedClass}>
            Führen Sie Onboarding-Prozesse durch, um Projekte zu erstellen.
          </p>
        </div>
      ) : (
        <div className={`${classes.bgClass} ${classes.borderClass} rounded-lg shadow-sm border overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} border-b ${classes.borderClass}`}>
                <tr>
                  {['Kunde', 'Erstellt', 'Status', 'Netzwerk', 'Hardware', 'Software', 'Aktionen'].map((header) => (
                    <th
                      key={header}
                      className={`px-6 py-3 text-left text-xs font-medium ${classes.textMutedClass} uppercase tracking-wider`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`${classes.bgClass} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {projects.map((project) => {
                  const status = project.status || 'neu';
                  const statusConf = statusConfig[status] || statusConfig['neu'];
                  const StatusIcon = statusConf.icon;

                  return (
                    <tr key={project.onboarding_id} className={`hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-150`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                            <Building className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${classes.textClass}`}>
                              {getCustomerName(project.kunde_id)}
                            </div>
                            <div className={`text-xs ${classes.textMutedClass}`}>
                              ID: {project.kunde_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${classes.textSecondaryClass}`}>
                          {project.created_at ? new Date(project.created_at).toLocaleDateString('de-DE') : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConf.bgClass}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConf.label}
                          </span>
                          <div className="flex space-x-1">
                            {status !== 'erledigt' && (
                              <button
                                onClick={() => updateStatus(project.onboarding_id, 'erledigt')}
                                disabled={statusLoading[project.onboarding_id]}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
                                title="Als erledigt markieren"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {status !== 'in Arbeit' && status !== 'erledigt' && (
                              <button
                                onClick={() => updateStatus(project.onboarding_id, 'in Arbeit')}
                                disabled={statusLoading[project.onboarding_id]}
                                className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded transition-colors"
                                title="In Arbeit setzen"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                            {status !== 'neu' && status !== 'erledigt' && (
                              <button
                                onClick={() => updateStatus(project.onboarding_id, 'neu')}
                                disabled={statusLoading[project.onboarding_id]}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                                title="Zurück auf neu setzen"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.has_network ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          <Network className="w-3 h-3 mr-1" />
                          {project.has_network ? 'Erfasst' : 'Fehlt'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${classes.textSecondaryClass}`}>
                          {project.hardware_count || 0} Geräte
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${classes.textSecondaryClass}`}>
                          {project.software_count || 0} Programme
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedProject(project)}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full transition-colors"
                            title="Projekt-Details anzeigen"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Details
                          </button>
                          <button
                            onClick={() => openEdit(project)}
                            className="inline-flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-medium rounded-full transition-colors"
                            title="Projekt bearbeiten"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Bearbeiten
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projekt-Details Modal - TODO: Implementieren */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${classes.bgClass} ${classes.borderClass} rounded-lg shadow-xl border p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-medium ${classes.textClass}`}>
                Projekt-Details: {getCustomerName(selectedProject.kunde_id)}
              </h3>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className={`text-sm ${classes.textMutedClass}`}>
              <p>Detailansicht wird hier implementiert...</p>
              <p>Onboarding-ID: {selectedProject.onboarding_id}</p>
              <p>Status: {selectedProject.status || 'neu'}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✨ Edit-Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${classes.bgClass} ${classes.borderClass} rounded-lg shadow-xl border p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-medium ${classes.textClass}`}>
                Projekt bearbeiten – ID {editForm.onboarding_id}
              </h3>
              <button
                onClick={() => setEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {editLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className={classes.textMutedClass}>Lade Projektdaten…</p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
                {/* Status */}
                <div>
                  <label className={`block text-sm mb-1 ${classes.textSecondaryClass}`}>Status</label>
                  <select
                    className="w-full rounded border px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="neu">Neu</option>
                    <option value="in Arbeit">In Arbeit</option>
                    <option value="erledigt">Erledigt</option>
                  </select>
                </div>

                {/* Datum */}
                <div>
                  <label className={`block text-sm mb-1 ${classes.textSecondaryClass}`}>Datum</label>
                  <input
                    type="date"
                    className="w-full rounded border px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    value={editForm.datum || ''}
                    onChange={e => setEditForm(f => ({ ...f, datum: e.target.value }))}
                  />
                </div>

                {/* Mitarbeiter-ID */}
                <div>
                  <label className={`block text-sm mb-1 ${classes.textSecondaryClass}`}>Mitarbeiter-ID (optional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="z. B. 1"
                    className="w-full rounded border px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    value={editForm.mitarbeiter_id}
                    onChange={e => setEditForm(f => ({ ...f, mitarbeiter_id: e.target.value }))}
                  />
                </div>

                {/* Infrastruktur JSON */}
                <div>
                  <label className={`block text-sm mb-1 ${classes.textSecondaryClass}`}>Infrastruktur (JSON)</label>
                  <textarea
                    rows={10}
                    className="w-full rounded border px-3 py-2 font-mono text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    value={editForm.infrastructure_data}
                    onChange={e => setEditForm(f => ({ ...f, infrastructure_data: e.target.value }))}
                  />
                  <p className={`text-xs mt-1 ${classes.textMutedClass}`}>
                    Hinweis: Gültiges JSON angeben, z. B. {"{ \"netzwerk\": {}, \"hardware\": {} }"}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saveLoading ? 'Speichere…' : 'Speichern'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
