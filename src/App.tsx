import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/common/TitleBar';
import { Dashboard } from './components/dashboard/Dashboard';
import { PassportStudio } from './components/passport/PassportStudio';
import { DocumentScanner } from './components/scanner/DocumentScanner';
import { ResizerStudio } from './components/resizer/ResizerStudio';
import { AboutModal } from './components/common/AboutModal';
import { UpdateModal } from './components/common/UpdateModal';
import { MobileNavBar } from './components/common/MobileNavBar';
import { ActiveModule, UpdateInfo } from './types';
import { createProjectJSON, parseProjectJSON } from './services/projectService';
import { App as CapApp } from '@capacitor/app';

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  const electronAPI = (window as any).electronAPI;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Android Native Hardware Back Button handler
  useEffect(() => {
    let backListener: any;
    const setupAndroidBackButton = async () => {
      try {
        backListener = await CapApp.addListener('backButton', () => {
          if (isUpdateModalOpen) {
            setIsUpdateModalOpen(false);
          } else if (isAboutOpen) {
            setIsAboutOpen(false);
          } else if (activeModule !== 'dashboard') {
            setActiveModule('dashboard');
          } else {
            CapApp.exitApp();
          }
        });
      } catch (e) {
        // Not running under Capacitor native runtime, ignore
      }
    };
    setupAndroidBackButton();
    return () => {
      backListener?.remove?.();
    };
  }, [activeModule, isAboutOpen, isUpdateModalOpen]);

  const handleCheckForUpdates = async (isManual = false) => {
    if (electronAPI && electronAPI.checkForUpdates) {
      if (isManual) {
        showToast('अपडेट की जांच हो रही है... (Checking for updates)');
      }
      try {
        const res = await electronAPI.checkForUpdates();
        if (res && res.hasUpdate) {
          setUpdateInfo(res);
          setHasUpdate(true);
          setIsUpdateModalOpen(true);
        } else if (isManual) {
          showToast('✅ आप पहले से ही नवीनतम वर्ज़न (v1.0.0) का उपयोग कर रहे हैं।');
        }
      } catch (e) {
        if (isManual) {
          showToast('अपडेट जांचने में समस्या आई। कृपया इंटरनेट चेक करें।');
        }
      }
    } else {
      if (isManual) {
        showToast('अपडेट चेक केवल Windows Desktop मोड में उपलब्ध है।');
      }
    }
  };

  // Listen for native notification click or main process update events
  useEffect(() => {
    if (electronAPI && electronAPI.onShowUpdateModal) {
      const cleanup = electronAPI.onShowUpdateModal((info: UpdateInfo) => {
        setUpdateInfo(info);
        setHasUpdate(true);
        setIsUpdateModalOpen(true);
      });
      return cleanup;
    }
  }, [electronAPI]);

  // Automatic silent update check on startup
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCheckForUpdates(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenImage = async () => {
    if (electronAPI) {
      const res = await electronAPI.openImage();
      if (res && res.dataUrl) {
        // If on dashboard, default to passport module
        if (activeModule === 'dashboard') {
          setActiveModule('passport');
        }
      }
    } else {
      // Mobile / Browser native image picker
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          if (activeModule === 'dashboard') {
            setActiveModule('passport');
          }
        }
      };
      input.click();
    }
  };

  const handleOpenProject = async () => {
    if (electronAPI) {
      const res = await electronAPI.openProject();
      if (res && res.content) {
        const parsed = parseProjectJSON(JSON.stringify(res.content));
        if (parsed) {
          showToast(`Opened project: ${res.path}`);
          if (parsed.module) {
            setActiveModule(parsed.module);
          }
        } else {
          showToast('Invalid project format.');
        }
      }
    } else {
      showToast('Native project loading requires desktop mode.');
    }
  };

  const handleSaveProject = async () => {
    const projectContent = createProjectJSON({
      module: activeModule === 'scanner' ? 'scanner' : activeModule === 'resizer' ? 'resizer' : 'passport',
    });

    if (electronAPI) {
      const res = await electronAPI.saveProject(projectContent, `Studio_Project_${Date.now()}.ppsp`);
      if (res.success) {
        showToast('Project saved successfully (.ppsp)!');
      }
    } else {
      const blob = new Blob([projectContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Studio_Project_${Date.now()}.ppsp`;
      a.click();
      showToast('Project downloaded (.ppsp)!');
    }
  };

  const handlePrint = async () => {
    if (electronAPI) {
      await electronAPI.printPage();
    } else {
      window.print();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100 select-none font-sans">
      {/* Sleek Native TitleBar */}
      <TitleBar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onOpenImage={handleOpenImage}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onPrint={handlePrint}
        onOpenAbout={() => setIsAboutOpen(true)}
        onCheckUpdates={() => handleCheckForUpdates(true)}
        hasUpdate={hasUpdate}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex overflow-hidden relative pb-14 md:pb-0">
        {activeModule === 'dashboard' && (
          <Dashboard
            onSelectModule={setActiveModule}
            onOpenImage={handleOpenImage}
          />
        )}

        {activeModule === 'passport' && (
          <PassportStudio onNotify={showToast} />
        )}

        {activeModule === 'scanner' && (
          <DocumentScanner />
        )}

        {activeModule === 'resizer' && (
          <ResizerStudio onNotify={showToast} />
        )}

        {/* Global Toast */}
        {toastMessage && (
          <div className="absolute bottom-20 md:bottom-6 right-6 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold animate-fade-in flex items-center space-x-2">
            <span>{toastMessage}</span>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible on mobile/tablets) */}
      <MobileNavBar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onCheckUpdates={() => handleCheckForUpdates(true)}
      />

      {/* Update Notification Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        updateInfo={updateInfo}
        onClose={() => setIsUpdateModalOpen(false)}
      />
    </div>
  );
};
