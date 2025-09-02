import React, { useState } from 'react';
import { X, Eye, EyeOff, Save, User } from 'lucide-react';
import { validateEmail } from '../utils/format';
import { API_BASE } from '../services/api';

export default function ProfileModal({ onClose, userInfo }) {
  const [loading, setLoading] = useState(false);
  const [pwd, setPwd] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false,
  });

  const parseJSONSafe = (t) => { try { return JSON.parse(t); } catch { return t; } };

  const changePassword = async () => {
    if (!pwd.currentPassword.trim()) return alert('Bitte geben Sie Ihr aktuelles Passwort ein');
    if (!pwd.newPassword.trim()) return alert('Bitte geben Sie ein neues Passwort ein');
    if (pwd.newPassword !== pwd.confirmPassword) return alert('Die neuen Passwörter stimmen nicht überein');
    if (pwd.newPassword.length < 8) return alert('Das neue Passwort muss mindestens 8 Zeichen lang sein');
    if (!/[A-Z]/.test(pwd.newPassword)) return alert('Das neue Passwort muss mindestens einen Großbuchstaben enthalten');
    if (!/[!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]/.test(pwd.newPassword)) return alert('Das neue Passwort muss ein Sonderzeichen enthalten');

    try {
      setLoading(true);
      let userId = null;
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const raw = currentUser.id || currentUser.mitarbeiter_id;
        if (raw && !isNaN(raw)) userId = parseInt(raw, 10);
      } catch {}

      if (!userId || isNaN(userId)) return alert('Benutzer-Session ungültig. Bitte neu anmelden.');

      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: pwd.currentPassword,
          newPassword: pwd.newPassword,
          user_id: userId,
        }),
      });

      const raw = await res.text().catch(() => '');
      const data = parseJSONSafe(raw);

      if (!res.ok) {
        if (res.status === 400 && data?.details?.length) {
          alert('Passwort-Anforderungen:\n' + data.details.join('\n'));
        } else {
          alert(data?.error || data?.message || raw || 'Fehler beim Ändern des Passworts');
        }
        return;
      }

      alert('Passwort erfolgreich geändert!');
      onClose();
    } catch (e) {
      alert('Unerwarteter Fehler beim Ändern des Passworts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profil anzeigen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-gray-900" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Angemeldet als</label>
            <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
              {userInfo?.email || 'Nicht verfügbar'}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Passwort ändern</h3>

            {[
              { key: 'currentPassword', label: 'Aktuelles Passwort', flag: 'showCurrentPassword' },
              { key: 'newPassword', label: 'Neues Passwort', flag: 'showNewPassword' },
              { key: 'confirmPassword', label: 'Neues Passwort bestätigen', flag: 'showConfirmPassword' },
            ].map((f) => (
              <div key={f.key} className="relative mb-3">
                <input
                  type={pwd[f.flag] ? 'text' : 'password'}
                  value={pwd[f.key]}
                  onChange={(e) => setPwd({ ...pwd, [f.key]: e.target.value })}
                  placeholder={f.label}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setPwd({ ...pwd, [f.flag]: !pwd[f.flag] })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {pwd[f.flag] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            ))}

            {pwd.currentPassword && pwd.newPassword && pwd.confirmPassword && (
              <button
                onClick={changePassword}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Passwort ändern</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
