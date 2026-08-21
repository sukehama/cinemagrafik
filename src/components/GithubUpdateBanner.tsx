import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GitBranch, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Sparkles, 
  ExternalLink, 
  ArrowRight,
  Tag,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  PackageCheck
} from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface GitHubAsset {
  id: number;
  name: string;
  size: number;
  browser_download_url: string;
  content_type?: string;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets?: GitHubAsset[];
  zipball_url?: string;
  tarball_url?: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

export interface GithubUpdateBannerProps {
  repoOwner?: string;
  repoName?: string;
  currentAppVersion?: string;
  onUpdateFound?: (hasUpdate: boolean, version: string) => void;
}

const STORAGE_KEY_INSTALLED_TAG = 'cinemagrafik_installed_release_tag';
const STORAGE_KEY_INSTALLED_SHA = 'cinemagrafik_installed_commit_sha';
const STORAGE_KEY_BANNER_DISMISSED = 'cinemagrafik_dismissed_update_id';

export default function GithubUpdateBanner({
  repoOwner = 'sukehama',
  repoName = 'cinemagrafik',
  currentAppVersion = 'v1.0.0',
  onUpdateFound
}: GithubUpdateBannerProps) {
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(null);
  const [latestCommit, setLatestCommit] = useState<GitHubCommit | null>(null);
  const [tauriUpdateObj, setTauriUpdateObj] = useState<any>(null);
  
  const [installedTag, setInstalledTag] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_INSTALLED_TAG) || currentAppVersion || 'v1.0.0';
    } catch {
      return currentAppVersion || 'v1.0.0';
    }
  });

  const [installedSha, setInstalledSha] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_INSTALLED_SHA) || 'initial_build_sha';
    } catch {
      return 'initial_build_sha';
    }
  });

  const [hasUpdate, setHasUpdate] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Update installation states
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatusText, setInstallStatusText] = useState('');
  const [isInstallSuccess, setIsInstallSuccess] = useState(false);
  const [showReleaseNotesModal, setShowReleaseNotesModal] = useState(false);

  // Helper to format file size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Check for updates from GitHub Releases, Commits, and Tauri Updater
  const checkForUpdates = useCallback(async (manual = false) => {
    setIsChecking(true);
    setCheckError(null);

    let foundUpdate = false;
    let newVersionLabel = '';

    // 1. Check Native Tauri Updater if in desktop environment
    try {
      const isTauri = typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__);
      if (isTauri) {
        const update = await check();
        if (update && update.available) {
          setTauriUpdateObj(update);
          setHasUpdate(true);
          foundUpdate = true;
          newVersionLabel = update.version || 'Nova verzija';
          if (onUpdateFound) onUpdateFound(true, newVersionLabel);
        }
      }
    } catch (tauriErr) {
      console.log('[Tauri Updater] Web or standalone environment, falling back to GitHub API check:', tauriErr);
    }

    // 2. Check GitHub Releases API (latest release)
    try {
      const releaseUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest?t=${Date.now()}`;
      const releaseRes = await fetch(releaseUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        }
      });

      if (releaseRes.ok) {
        const releaseData: GitHubRelease = await releaseRes.json();
        if (releaseData && releaseData.tag_name) {
          setLatestRelease(releaseData);
          newVersionLabel = releaseData.tag_name;

          const savedTag = localStorage.getItem(STORAGE_KEY_INSTALLED_TAG);
          const dismissedId = localStorage.getItem(STORAGE_KEY_BANNER_DISMISSED);

          // Compare release tag with current installed tag
          const cleanLatestTag = releaseData.tag_name.trim().toLowerCase();
          const cleanInstalledTag = (savedTag || installedTag || currentAppVersion).trim().toLowerCase();

          if (cleanLatestTag !== cleanInstalledTag) {
            setHasUpdate(true);
            foundUpdate = true;

            if (dismissedId === String(releaseData.id) || dismissedId === releaseData.tag_name) {
              if (!manual) {
                setIsDismissed(true);
              } else {
                setIsDismissed(false);
              }
            } else {
              setIsDismissed(false);
            }

            if (onUpdateFound) onUpdateFound(true, releaseData.tag_name);
            setIsChecking(false);
            return;
          }
        }
      } else if (releaseRes.status === 404) {
        // If /releases/latest is 404, check /releases list
        const releasesListUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases?per_page=1&t=${Date.now()}`;
        const listRes = await fetch(releasesListUrl, {
          headers: { Accept: 'application/vnd.github.v3+json' }
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          if (Array.isArray(listData) && listData.length > 0) {
            const firstRel = listData[0];
            setLatestRelease(firstRel);
            newVersionLabel = firstRel.tag_name;
            const cleanLatest = firstRel.tag_name.trim().toLowerCase();
            const cleanInstalled = (localStorage.getItem(STORAGE_KEY_INSTALLED_TAG) || installedTag || currentAppVersion).trim().toLowerCase();
            if (cleanLatest !== cleanInstalled) {
              setHasUpdate(true);
              foundUpdate = true;
              setIsDismissed(false);
              if (onUpdateFound) onUpdateFound(true, firstRel.tag_name);
              setIsChecking(false);
              return;
            }
          }
        }
      }
    } catch (relErr) {
      console.warn('Error fetching GitHub releases:', relErr);
    }

    // 3. Check GitHub Commits API as fallback or additional check
    try {
      const commitUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/commits?per_page=1&t=${Date.now()}`;
      const commitRes = await fetch(commitUrl, {
        headers: { Accept: 'application/vnd.github.v3+json' }
      });

      if (commitRes.ok) {
        const commitData = await commitRes.json();
        if (Array.isArray(commitData) && commitData.length > 0) {
          const commit: GitHubCommit = commitData[0];
          setLatestCommit(commit);

          const savedSha = localStorage.getItem(STORAGE_KEY_INSTALLED_SHA);
          const dismissedId = localStorage.getItem(STORAGE_KEY_BANNER_DISMISSED);

          // If no release tag was found, use commit sha
          if (!latestRelease) {
            if (savedSha && savedSha !== commit.sha) {
              setHasUpdate(true);
              foundUpdate = true;
              if (dismissedId === commit.sha) {
                if (!manual) setIsDismissed(true);
                else setIsDismissed(false);
              } else {
                setIsDismissed(false);
              }
              if (onUpdateFound) onUpdateFound(true, commit.sha.substring(0, 7));
            }
          }
        }
      }
    } catch (comErr) {
      console.warn('Error fetching GitHub commits:', comErr);
    }

    if (!foundUpdate && !tauriUpdateObj) {
      setHasUpdate(false);
      if (onUpdateFound) onUpdateFound(false, '');
    }

    setIsChecking(false);
  }, [repoOwner, repoName, currentAppVersion, installedTag, latestRelease, tauriUpdateObj, onUpdateFound]);

  // Initial check on mount & periodically every 3 minutes
  useEffect(() => {
    checkForUpdates(false);
    const interval = setInterval(() => checkForUpdates(false), 180000);

    // Listen for custom trigger from navbar/tools
    const handleTriggerEvent = () => {
      checkForUpdates(true);
    };
    window.addEventListener('check-for-github-updates', handleTriggerEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('check-for-github-updates', handleTriggerEvent);
    };
  }, [checkForUpdates]);

  // Execute update download / manual install
  const handleInstallUpdate = async () => {
    // 1. Find direct .exe, .msi, .zip or main release asset if available
    let downloadUrl: string | null = null;
    let assetName = '';

    if (latestRelease?.assets && latestRelease.assets.length > 0) {
      // Prioritize windows executable / installer
      const exeAsset = latestRelease.assets.find(a => 
        a.name.toLowerCase().endsWith('.exe') || 
        a.name.toLowerCase().endsWith('.msi') ||
        a.name.toLowerCase().endsWith('.zip')
      );
      if (exeAsset) {
        downloadUrl = exeAsset.browser_download_url;
        assetName = exeAsset.name;
      } else {
        downloadUrl = latestRelease.assets[0].browser_download_url;
        assetName = latestRelease.assets[0].name;
      }
    }

    // Fallback to GitHub Release HTML page
    if (!downloadUrl) {
      downloadUrl = latestRelease?.html_url || latestCommit?.html_url || `https://github.com/${repoOwner}/${repoName}/releases/latest`;
    }

    setIsInstalling(true);
    setInstallProgress(100);
    setInstallStatusText(assetName ? `Preuzimanje fajla: ${assetName}...` : 'Otvaranje stranice za preuzimanje...');

    // Mark as updated in local storage
    try {
      if (latestRelease?.tag_name) {
        localStorage.setItem(STORAGE_KEY_INSTALLED_TAG, latestRelease.tag_name);
        setInstalledTag(latestRelease.tag_name);
      }
      if (latestCommit?.sha) {
        localStorage.setItem(STORAGE_KEY_INSTALLED_SHA, latestCommit.sha);
        setInstalledSha(latestCommit.sha);
      }
      localStorage.removeItem(STORAGE_KEY_BANNER_DISMISSED);
    } catch {}

    // Trigger instant browser download or open in new tab
    if (typeof window !== 'undefined' && downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      if (assetName) {
        link.download = assetName;
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setTimeout(() => {
      setIsInstalling(false);
      setIsInstallSuccess(true);
      setTimeout(() => {
        setIsInstallSuccess(false);
        setHasUpdate(false);
      }, 3000);
    }, 1000);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      const dismissKey = latestRelease?.tag_name || latestRelease?.id || latestCommit?.sha;
      if (dismissKey) {
        localStorage.setItem(STORAGE_KEY_BANNER_DISMISSED, String(dismissKey));
      }
    } catch {}
  };

  // If dismissed, render a small, sleek floating badge in the corner so user can still access it anytime
  if (!hasUpdate && !isChecking) {
    return null;
  }

  const releaseVersion = latestRelease?.tag_name || (latestCommit ? `commit ${latestCommit.sha.substring(0, 7)}` : 'Novo Izdanje');
  const releaseTitle = latestRelease?.name || latestCommit?.commit.message.split('\n')[0] || 'Novo ažuriranje je objavljeno';
  const releaseUrl = latestRelease?.html_url || latestCommit?.html_url || `https://github.com/${repoOwner}/${repoName}/releases`;

  const releaseDate = latestRelease?.published_at 
    ? new Date(latestRelease.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : latestCommit?.commit.author.date 
      ? new Date(latestCommit.commit.author.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '';

  // Collapsed / Dismissed state floating pill
  if (isDismissed && hasUpdate) {
    return (
      <div 
        className="fixed right-20 z-50 animate-bounce-short"
        style={{ top: 'max(0.75rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
      >
        <button
          onClick={() => {
            setIsDismissed(false);
            localStorage.removeItem(STORAGE_KEY_BANNER_DISMISSED);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-400/40 hover:scale-105 transition-all cursor-pointer"
          title="Kliknite za prikaz novog ažuriranja"
        >
          <Sparkles size={13} className="text-yellow-300 animate-spin-slow" />
          <span>Ažuriranje {releaseVersion}</span>
          <ArrowRight size={12} />
        </button>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {hasUpdate && !isDismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            id="github-update-notification-banner"
            className="relative z-50 bg-gradient-to-r from-blue-950/95 via-indigo-950/95 to-purple-950/95 border-b border-blue-500/40 text-white shadow-2xl backdrop-blur-2xl"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              
              {/* Left Info & Release Tag */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.35)] animate-pulse">
                  <Tag size={16} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black uppercase tracking-wider text-blue-200 text-[10px] bg-blue-500/25 px-2.5 py-0.5 rounded-full border border-blue-400/40 flex items-center gap-1 shadow-sm">
                      <Sparkles size={10} className="text-yellow-400" />
                      Novo Izdanje • {releaseVersion}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {repoOwner}/{repoName} {releaseDate && `• ${releaseDate}`}
                    </span>
                  </div>
                  <p className="font-bold text-zinc-100 truncate mt-0.5 max-w-xl text-[11px]">
                    {releaseTitle}
                  </p>
                </div>
              </div>

              {/* Right Action Controls */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 flex-wrap">
                {latestRelease?.body && (
                  <button
                    type="button"
                    onClick={() => setShowReleaseNotesModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-700/80 transition-all text-xs font-bold cursor-pointer"
                    title="Pogledaj opis i promjene izdanja"
                  >
                    <FileText size={13} className="text-blue-400" />
                    <span>Šta je novo?</span>
                  </button>
                )}

                <a
                  href={releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer"
                  title="Otvori izdanje na GitHub-u"
                >
                  <ExternalLink size={14} />
                </a>

                {/* Primary Update Button */}
                <button
                  onClick={handleInstallUpdate}
                  disabled={isInstalling}
                  id="btn-install-release-update"
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-400 hover:to-indigo-400 text-white font-black px-4 py-1.5 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 text-xs tracking-wide"
                >
                  {isInstalling ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Preuzimanje...</span>
                    </>
                  ) : isInstallSuccess ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-300" />
                      <span>Preuzeto!</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>Preuzmi {releaseVersion} (.exe)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer"
                  title="Sakrij traku"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Progress Bar overlay */}
            {isInstalling && (
              <div className="w-full bg-blue-950/60 h-1.5 relative overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 transition-all duration-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  style={{ width: `${installProgress}%` }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILED RELEASE NOTES MODAL */}
      <AnimatePresence>
        {showReleaseNotesModal && latestRelease && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-blue-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold text-xs border border-blue-400/30">
                      {latestRelease.tag_name}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      Objavljeno: {releaseDate}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">
                    {latestRelease.name || `Izdanje ${latestRelease.tag_name}`}
                  </h3>
                </div>
                <button
                  onClick={() => setShowReleaseNotesModal(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Release Body / Changelog */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin text-xs sm:text-sm text-zinc-300 leading-relaxed bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80 whitespace-pre-wrap font-sans">
                {latestRelease.body || 'Nema dodatnog opisa za ovo izdanje.'}
              </div>

              {/* Attached Binaries / Assets if available */}
              {latestRelease.assets && latestRelease.assets.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                    <Download size={13} className="text-blue-400" />
                    Direktno preuzimanje instalacionih paketa ({latestRelease.assets.length}):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {latestRelease.assets.map(asset => (
                      <a
                        key={`asset-${asset.id}`}
                        href={asset.browser_download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-950/20 transition-all text-xs font-bold text-zinc-200 group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <PackageCheck size={14} className="text-blue-400 shrink-0" />
                          <span className="truncate group-hover:text-blue-300">{asset.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 shrink-0 font-mono ml-2">
                          {formatBytes(asset.size)}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-800">
                <a
                  href={latestRelease.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition font-bold"
                >
                  <ExternalLink size={13} />
                  <span>Pregledaj na GitHub-u</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowReleaseNotesModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
                  >
                    Zatvori
                  </button>
                  <button
                    onClick={() => {
                      setShowReleaseNotesModal(false);
                      handleInstallUpdate();
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white shadow-lg shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    <span>Preuzmi Izdanje (.exe)</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Global helper function to trigger update check from any button in the app
export function triggerManualUpdateCheck() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_BANNER_DISMISSED);
    } catch {}
    window.dispatchEvent(new CustomEvent('check-for-github-updates'));
  }
}
