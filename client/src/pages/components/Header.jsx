import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Sun, Moon, User, Edit3, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfileModal from './ProfileModal';

export default function Header({
  isDark, toggle, onRefresh, userInfo, onLogout, onLogoClick,
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowProfile(false);
    };
    if (showProfile) {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showProfile]);

  return (
    <>
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} userInfo={userInfo} />
      )}

      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-3 grid grid-cols-[1fr_auto_1fr] items-center">
        <div className="justify-self-start" />
        <button type="button" onClick={onLogoClick} className="justify-self-center" aria-label="Zur Übersicht">
          <img src="/pauly_logo4.png" alt="Pauly Logo" className="h-16 w-auto" />
        </button>

        <div className="flex items-center space-x-3 justify-self-end">
          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-md"
            title="Daten aktualisieren"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <div className="relative flex items-center" ref={ref}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 rounded-md"
            >
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-900" />
              </div>
            </button>

            <button
              onClick={toggle}
              className="ml-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              title={isDark ? 'Hellmodus' : 'Dunkelmodus'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {userInfo?.vorname} {userInfo?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userInfo?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setShowProfile(false); setShowProfileModal(true); }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Profil anzeigen
                  </button>

                  <Link
                    to="/profile/mfa"
                    onClick={() => setShowProfile(false)}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    MFA einrichten
                  </Link>

                  <hr className="my-1 border-gray-100 dark:border-gray-800" />
                  <button
                    onClick={() => { setShowProfile(false); onLogout(); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Abmelden
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
