import React, { useState, useEffect } from 'react';
import { Briefcase, Eye, Edit, CheckCircle, Clock, Building, Network, User } from 'lucide-react';
import { fetchJSON } from 'services/api';

const statusConfig = {
  'offen': {
    label: 'Noch offen',
    bgClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: Clock
  },
  'erledigt': {
    label: 'Erledigt',
    bgClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: CheckCircle
  }
};

export default function ProjectsSection({ isDark, customers, loading, onRefreshData }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState({});

  const classes = {
    bgClass: isDark ? 'bg-gray-800' : 'bg-white',
    borderClass: isDark ? 'border-gray-700' : 'border-gray-200',
    textClass: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondaryClass: isDark ? 'text-gray-300' : 'text-gray-700',
    textMutedClass: isDark ? 'text-gray-400' : 'text-gray-500',
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const data = await fetchJSON('/onboarding/projects');
      setProjects(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const updateStatus = async (onboardingId, newStatus) => {
    setStatusLoading(prev => ({ ...prev, [onboardingId]: true }));
    try {
      await fetchJSON(`/onboarding/${onboardingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      // Lokale State aktualisieren
      setProjects(prev => prev.map(p => 
        p.onboarding_id === onboardingId 
          ? { ...p, status: newStatus }
          : p
      ));

      // Dashboard-Statistiken neu laden
      if (onRefreshData) {
        await onRefreshData();
      }

    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      alert(`Fehler beim Aktualisieren: ${error.message}`);
    } finally {
      setStatusLoading(prev => ({ ...prev, [onboardingId]: false }));
    }
  };

  const getCustomerName = (kundeId) => {
    const customer = customers.find(c => c.kunden_id === kundeId);
    return customer?.firmenname || 'Unbekannt';
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
                  const status = project.status || 'offen';
                  const statusConf = statusConfig[status] || statusConfig['offen'];
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
                            {status !== 'offen' && (
                              <button
                                onClick={() => updateStatus(project.onboarding_id, 'offen')}
                                disabled={statusLoading[project.onboarding_id]}
                                className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded transition-colors"
                                title="Als offen markieren"
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
                            onClick={() => {/* TODO: Edit-Modal */}}
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
                className={`text-gray-400 hover:${classes.textSecondaryClass} transition-colors`}
              >
                ✕
              </button>
            </div>
            <div className={`text-sm ${classes.textMutedClass}`}>
              <p>Detailansicht wird hier implementiert...</p>
              <p>Onboarding-ID: {selectedProject.onboarding_id}</p>
              <p>Status: {selectedProject.status || 'offen'}</p>
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
    </div>
  );
}