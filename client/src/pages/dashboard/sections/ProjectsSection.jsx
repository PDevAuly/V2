import React, { useState, useEffect } from 'react';
import { Briefcase, Eye, Edit, CheckCircle, Clock, Building, Network, X } from 'lucide-react';
import { fetchJSON } from 'services/api';
import ProjectEditModal from '../sections/ProjectEditModal'; // Pfad ggf. anpassen

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
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState({});
  const [editingId, setEditingId] = useState(null); // NEU: State für Edit-Modal

  // Details-Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // Edit-Modal (alt)
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    onboarding_id: null,
    title: '',
    description: '',
    status: 'neu',
    start_date: '',
    end_date: '',
    budget: ''
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

  const getCustomerName = (kundeId) => {
    const customer = customers.find(c => Number(c.kunden_id) === Number(kundeId));
    return customer?.firmenname || 'Unbekannt';
  };

  // Status schnell ändern
  const updateStatus = async (onboardingId, newStatus) => {
    setStatusLoading(prev => ({ ...prev, [onboardingId]: true }));
    try {
      await fetchJSON(`/onboarding/${onboardingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
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

  // DETAILS: lädt vollständige Daten (inkl. Hardwareliste) und öffnet Modal
  const openDetails = async (project) => {
    try {
      setDetailLoading(true);
      const data = await fetchJSON(`/onboarding/${project.onboarding_id}`);
      setDetailData(data);
      setDetailOpen(true);
    } catch (e) {
      console.error('Fehler beim Laden der Projektdetails:', e);
      alert(`Fehler beim Laden der Projektdetails: ${e.message || e}`);
    } finally {
      setDetailLoading(false);
    }
  };

  // BEARBEITEN: lädt Details und öffnet Modal (alt)
  const openEdit = async (project) => {
    try {
      setEditLoading(true);
      const data = await fetchJSON(`/onboarding/${project.onboarding_id}`);

      setEditForm({
        onboarding_id: data.onboarding_id,
        title: data.title || '',
        description: data.description || '',
        status: data.status || 'neu',
        start_date: data.start_date ? data.start_date.slice(0, 10) : '',
        end_date: data.end_date ? data.end_date.slice(0, 10) : '',
        budget: data.budget != null ? String(data.budget) : ''
      });

      setEditOpen(true);
    } catch (e) {
      console.error('Fehler beim Laden der Projektdetails (Edit):', e);
      alert(`Fehler beim Laden der Projektdetails: ${e.message || e}`);
    } finally {
      setEditLoading(false);
    }
  };

  // BEARBEITEN speichern (alt)
  const saveEdit = async () => {
    try {
      setSaveLoading(true);

      const body = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        status: editForm.status,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        budget: editForm.budget === '' ? null : Number(editForm.budget)
      };

      await fetchJSON(`/onboarding/${editForm.onboarding_id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      // Backend gibt nur message + onboarding_id zurück -> Liste neu laden
      await loadProjects();
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
                  {['Kunde', 'Titel', 'Erstellt', 'Status', 'Netzwerk', 'Hardware', 'Software', 'Aktionen'].map((header) => (
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
                        <div className={`text-sm font-medium ${classes.textClass}`}>
                          {project.title || 'Ohne Titel'}
                        </div>
                        <div className={`text-xs ${classes.textMutedClass} truncate max-w-xs`}>
                          {project.description || 'Keine Beschreibung'}
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
                            onClick={() => openDetails(project)}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full transition-colors"
                            title="Projekt-Details anzeigen"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Details
                          </button>
                          <button
                            onClick={() => setEditingId(project.onboarding_id)}
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

      {/* NEU: ProjectEditModal */}
      {editingId && (
        <ProjectEditModal
          onboardingId={editingId}
          isDark={isDark}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            loadProjects();
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* ALTES EDIT Modal (kann entfernt werden, wenn nicht mehr benötigt) */}
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
                <X className="w-5 h-5" />
              </button>
            </div>

            {editLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className={classes.textMutedClass}>Lade Projektdaten…</p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
                {/* Titel */}
                <div>
                  <label className={`block text-sm mb-1 ${classes.textSecondaryClass}`}>Titel</label>
                  <input
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900"
                    value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>

                {/* Beschreibung */}
                <div>
                  <label className={`block text-sm mb-1 ${classes.textSecondaryClass}`}>Beschreibung</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900"
                    rows={4}
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status */}
                  <div>
                    <label className={`block text-sm mb-1 ${classes.textSecondaryClass}`}>Status</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900"
                      value={editForm.status}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="neu">Neu</option>
                      <option value="in Arbeit">In Arbeit</option>
                      <option value="erledigt">Erledigt</option>
                    </select>
                  </div>

                  {/* Startdatum */}
                  <div>
                    <label className={`block text-sm mb-1 ${classes.textSecondaryClass}`}>Startdatum</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900"
                      value={editForm.start_date}
                      onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))}
                    />
                  </div>

                  {/* Enddatum */}
                  <div>
                    <label className={`block text-sm mb-1 ${classes.textSecondaryClass}`}>Enddatum</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900"
                      value={editForm.end_date}
                      onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className={`block text-sm mb-1 ${classes.textSecondaryClass}`}>Budget (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900"
                    value={editForm.budget}
                    onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="px-4 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-700"
                    disabled={saveLoading}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={saveLoading}
                  >
                    {saveLoading ? 'Speichern…' : 'Speichern'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DETAILS Modal */}
      {detailOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${classes.bgClass} ${classes.borderClass} rounded-lg shadow-xl border p-6 max-w-5xl w-full max-h-[85vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-medium ${classes.textClass}`}>
                Projekt-Details: {detailData ? getCustomerName(detailData.kunde_id) : '—'}
              </h3>
              <button
                onClick={() => setDetailOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !detailData ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className={classes.textMutedClass}>Lade Details…</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Meta */}
                <div className={`${classes.bgClass} ${classes.borderClass} rounded border p-4`}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="font-medium">Onboarding-ID:</span> {detailData.onboarding_id}</div>
                    <div><span className="font-medium">Status:</span> {detailData.status}</div>
                    <div><span className="font-medium">Datum:</span> {detailData.datum ? new Date(detailData.datum).toLocaleDateString('de-DE') : '—'}</div>
                    <div><span className="font-medium">Mitarbeiter-ID:</span> {detailData.mitarbeiter_id ?? '—'}</div>
                  </div>
                </div>

                {/* Titel und Beschreibung */}
                <div className={`${classes.bgClass} ${classes.borderClass} rounded border p-4`}>
                  <h4 className={`text-md font-semibold mb-3 ${classes.textClass}`}>Projektinformationen</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Titel:</span> {detailData.title || '—'}</div>
                    <div><span className="font-medium">Beschreibung:</span> {detailData.description || '—'}</div>
                    <div><span className="font-medium">Budget:</span> {detailData.budget ? `${detailData.budget} €` : '—'}</div>
                  </div>
                </div>

                {/* Netzwerk */}
                <div className={`${classes.bgClass} ${classes.borderClass} rounded border p-4`}>
                  <h4 className={`text-md font-semibold mb-3 ${classes.textClass}`}>Netzwerk</h4>
                  {detailData.netzwerk ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div><span className="font-medium">Zugangsart:</span> {detailData.netzwerk.internetzugangsart ?? '—'}</div>
                      <div><span className="font-medium">Firewall-Modell:</span> {detailData.netzwerk.firewall_modell ?? '—'}</div>
                      <div><span className="font-medium">Feste IP:</span> {detailData.netzwerk.feste_ip_vorhanden ? 'Ja' : 'Nein'}</div>
                      <div><span className="font-medium">IP-Adresse:</span> {detailData.netzwerk.ip_adresse ?? '—'}</div>
                      <div><span className="font-medium">VPN erforderlich:</span> {detailData.netzwerk.vpn_einwahl_erforderlich ? 'Ja' : 'Nein'}</div>
                      <div><span className="font-medium">VPN User (aktuell/geplant):</span> {detailData.netzwerk.aktuelle_vpn_user ?? 0} / {detailData.netzwerk.geplante_vpn_user ?? 0}</div>
                      <div className="md:col-span-3"><span className="font-medium">Informationen:</span> {detailData.netzwerk.informationen ?? '—'}</div>
                    </div>
                  ) : (
                    <p className={classes.textMutedClass}>Keine Netzwerkdaten erfasst.</p>
                  )}
                </div>

                {/* Hardware – komplette Liste */}
                <div className={`${classes.bgClass} ${classes.borderClass} rounded border p-4`}>
                  <h4 className={`text-md font-semibold mb-3 ${classes.textClass}`}>Hardware ({detailData.hardware?.length || 0})</h4>
                  {Array.isArray(detailData.hardware) && detailData.hardware.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <tr>
                            {['Typ', 'Hersteller', 'Modell', 'Seriennummer', 'Standort', 'IP', 'Infos/Details'].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className={`${isDark ? 'divide-gray-700' : 'divide-gray-200'} divide-y`}>
                          {detailData.hardware.map(h => (
                            <tr key={h.hardware_id}>
                              <td className="px-3 py-2">{h.typ ?? '—'}</td>
                              <td className="px-3 py-2">{h.hersteller ?? '—'}</td>
                              <td className="px-3 py-2">{h.modell ?? '—'}</td>
                              <td className="px-3 py-2">{h.seriennummer ?? '—'}</td>
                              <td className="px-3 py-2">{h.standort ?? '—'}</td>
                              <td className="px-3 py-2">{h.ip ?? '—'}</td>
                              <td className="px-3 py-2">
                                {h.informationen ? <div className="mb-1">{h.informationen}</div> : null}
                                {h.details_jsonb ? (
                                  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(h.details_jsonb, null, 2)}</pre>
                                ) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className={classes.textMutedClass}>Keine Hardware erfasst.</p>
                  )}
                </div>

                {/* Software (kurz) */}
                <div className={`${classes.bgClass} ${classes.borderClass} rounded border p-4`}>
                  <h4 className={`text-md font-semibold mb-3 ${classes.textClass}`}>Software ({detailData.software?.length || 0})</h4>
                  {Array.isArray(detailData.software) && detailData.software.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm">
                      {detailData.software.map(s => (
                        <li key={s.software_id} className="mb-1">
                          <span className="font-medium">{s.name || 'Unbenannt'}</span>
                          {typeof s.licenses === 'number' ? ` · Lizenzen: ${s.licenses}` : ''}
                          {s.apps?.length ? ` · Apps: ${s.apps.map(a => a.name).join(', ')}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={classes.textMutedClass}>Keine Software erfasst.</p>
                  )}
                </div>

                {/* Mail & Backup & Sonstiges (kurz) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`${classes.bgClass} ${classes.borderClass} rounded border p-4`}>
                    <h4 className={`text-md font-semibold mb-3 ${classes.textClass}`}>Mail</h4>
                    {detailData.mail ? (
                      <div className="text-sm space-y-1">
                        <div><span className="font-medium">Anbieter:</span> {detailData.mail.anbieter ?? '—'}</div>
                        <div><span className="font-medium">Postfächer/Shared:</span> {detailData.mail.anzahl_postfach ?? 0} / {detailData.mail.anzahl_shared ?? 0}</div>
                        <div><span className="font-medium">POP3:</span> {detailData.mail.pop3_connector ? 'Ja' : 'Nein'}</div>
                        <div><span className="font-medium">Mobil:</span> {detailData.mail.mobiler_zugriff ? 'Ja' : 'Nein'}</div>
                      </div>
                    ) : <p className={classes.textMutedClass}>Keine Maildaten.</p>}
                  </div>

                  <div className={`${classes.bgClass} ${classes.borderClass} rounded border p-4`}>
                    <h4 className={`text-md font-semibold mb-3 ${classes.textClass}`}>Backup</h4>
                    {detailData.backup ? (
                      <div className="text-sm space-y-1">
                        <div><span className="font-medium">Tool:</span> {detailData.backup.tool ?? '—'}</div>
                        <div><span className="font-medium">Intervall:</span> {detailData.backup.interval ?? '—'}</div>
                        <div><span className="font-medium">Retention:</span> {detailData.backup.retention ?? '—'}</div>
                        <div><span className="font-medium">Ort:</span> {detailData.backup.location ?? '—'}</div>
                      </div>
                    ) : <p className={classes.textMutedClass}>Keine Backup-Daten.</p>}
                  </div>

                  <div className={`${classes.bgClass} ${classes.borderClass} rounded border p-4`}>
                    <h4 className={`text-md font-semibold mb-3 ${classes.textClass}`}>Sonstiges</h4>
                    <div className="text-sm whitespace-pre-wrap">{detailData.sonstiges?.text ?? '—'}</div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setDetailOpen(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}