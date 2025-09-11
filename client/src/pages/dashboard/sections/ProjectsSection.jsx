import React, { useState, useEffect } from 'react';
import {
  Briefcase, Eye, Edit, CheckCircle, Clock, Building, Network, X, Send
} from 'lucide-react';
import { fetchJSON } from 'services/api';
import ProjectEditModal from '../sections/ProjectEditModal'; // Pfad ggf. anpassen

const statusConfig = {
  neu: {
    label: 'Neu',
    bgClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: Clock,
  },
  'in Arbeit': {
    label: 'In Arbeit',
    bgClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: Clock,
  },
  erledigt: {
    label: 'Erledigt',
    bgClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: CheckCircle,
  },
};

export default function ProjectsSection({ isDark, customers = [], loading, onRefreshData }) {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  // Details-Modal (leichtgewichtig)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

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
      // nutzt: GET /api/onboarding/projects
      const data = await fetchJSON('/onboarding/projects');
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const getCustomerName = (kundeId) => {
    const customer = customers.find((c) => Number(c.kunden_id) === Number(kundeId));
    return customer?.firmenname || 'Unbekannt';
  };

  const getCustomerEmail = (project) => project?.email || '';

  // Status schnell ändern
  const updateStatus = async (onboardingId, newStatus) => {
    setStatusLoading((prev) => ({ ...prev, [onboardingId]: true }));
    try {
      await fetchJSON(`/onboarding/${onboardingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setProjects((prev) =>
        prev.map((p) => (p.onboarding_id === onboardingId ? { ...p, status: newStatus } : p)),
      );
      if (onRefreshData) await onRefreshData();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      alert(`Fehler beim Aktualisieren: ${error.message}`);
    } finally {
      setStatusLoading((prev) => ({ ...prev, [onboardingId]: false }));
    }
  };

  // DETAILS: lädt vollständige Daten und öffnet Modal
  const openDetails = async (project) => {
    try {
      setDetailLoading(true);
      // nutzt: GET /api/onboarding/:id
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

  // SENDEN: per Mail, optional mit PDF
  const sendProject = async (project) => {
    const defaultTo = getCustomerEmail(project);
    const to = window.prompt(
      `Empfänger-Adresse bestätigen/anpassen:`,
      defaultTo || ''
    );
    if (to === null) return; // abgebrochen

    const attachPdf = window.confirm('Als PDF anhängen? (OK = ja, Abbrechen = nein)');
    setSendingId(project.onboarding_id);
    try {
      await fetchJSON(`/onboarding/${project.onboarding_id}/send-email`, {
        method: 'POST',
        body: JSON.stringify({ to, attachPdf: !!attachPdf }),
      });
      alert('E-Mail wurde gesendet ✅');
    } catch (e) {
      console.error('Fehler beim Senden:', e);
      alert(`Fehler beim Senden: ${e.message || e}`);
    } finally {
      setSendingId(null);
    }
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={classes.textMutedClass}>Lade Projekte…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-semibold ${classes.textClass} mb-2`}>IT-Projekte</h2>
          <p className={classes.textMutedClass}>{projects.length} Projekte insgesamt</p>
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
          <h3 className={`text-lg font-medium ${classes.textClass} mb-2`}>Keine Projekte vorhanden</h3>
          <p className={classes.textMutedClass}>Führen Sie Onboarding-Prozesse durch, um Projekte zu erstellen.</p>
        </div>
      ) : (
        <div className={`${classes.bgClass} ${classes.borderClass} rounded-lg shadow-sm border overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} border-b ${classes.borderClass}`}>
                <tr>
                  {['Kunde', 'Erstellt', 'Status', 'Netzwerk', 'Hardware', 'Software', 'Aktionen'].map((h) => (
                    <th
                      key={h}
                      className={`px-6 py-3 text-left text-xs font-medium ${classes.textMutedClass} uppercase tracking-wider`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`${classes.bgClass} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {projects.map((project) => {
                  const status = project.status || 'neu';
                  const statusConf = statusConfig[status] || statusConfig.neu;
                  const StatusIcon = statusConf.icon;

                  return (
                    <tr key={project.onboarding_id} className={`hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}>
                      {/* Kunde */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                            <Building className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{project.firmenname || getCustomerName(project.kunde_id)}</div>
                            <div className={`text-xs ${classes.textMutedClass}`}>{project.email || '—'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Erstellt */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${classes.textSecondaryClass}`}>
                          {project.created_at ? new Date(project.created_at).toLocaleDateString() : '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConf.bgClass}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Netzwerk */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center text-xs ${classes.textSecondaryClass}`}>
                          <Network className="w-4 h-4 mr-1" />
                          {project.has_network ? 'Erfasst' : 'Fehlt'}
                        </span>
                      </td>

                      {/* Hardware count */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${classes.textSecondaryClass}`}>{project.hardware_count || 0} Geräte</span>
                      </td>

                      {/* Software count */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${classes.textSecondaryClass}`}>{project.software_count || 0} Programme</span>
                      </td>

                      {/* Aktionen */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
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
                          <button
                            onClick={() => sendProject(project)}
                            disabled={sendingId === project.onboarding_id}
                            className="inline-flex items-center px-3 py-1 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium rounded-full transition-colors disabled:opacity-60"
                            title="Kundendetails & Projektinformationen per E-Mail senden"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            {sendingId === project.onboarding_id ? 'Senden…' : 'Senden'}
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

      {/* Bearbeiten (neues, großes Modal) */}
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

      {/* Leichtes Details-Modal */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`${classes.bgClass} ${classes.borderClass} border rounded-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-lg font-semibold ${classes.textClass}`}>Projektdetails</h3>
              <button onClick={() => setDetailOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {detailLoading ? (
                <p className={classes.textMutedClass}>Lade…</p>
              ) : !detailData ? (
                <p className={classes.textMutedClass}>Keine Daten.</p>
              ) : (
                <>
                  <div className="text-sm">
                    <div className="font-medium">Onboarding-ID: {detailData.onboarding_id}</div>
                    <div className={`${classes.textMutedClass}`}>Kunde: {detailData?.kunde_id}</div>
                    <div>Status: {detailData?.status}</div>
                    {detailData?.datum && <div>Datum: {new Date(detailData.datum).toLocaleDateString()}</div>}
                  </div>
                  <pre className="text-xs whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-auto">
                    {JSON.stringify(detailData, null, 2)}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
