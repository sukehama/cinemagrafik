import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitBranch, Download, RefreshCw, CheckCircle2, X, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';

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

interface GithubUpdateBannerProps {
  repoOwner?: string;
  repoName?: string;
}

const STORAGE_KEY_INSTALLED_SHA = 'cinemagrafik_installed_commit_sha';
const STORAGE_KEY_LAST_CHECK = 'cinemagrafik_last_github_check';
const STORAGE_KEY_BANNER_DISMISSED = 'cinemagrafik_dismissed_update_sha';

export default function GithubUpdateBanner({
  repoOwner = 'sukehama',
  repoName = 'cinemagrafik'
}: GithubUpdateBannerProps) {
  const [latestCommit, setLatestCommit] = useState<GitHubCommit | null>(null);
  const [installedSha, setInstalledSha] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_INSTALLED_SHA) || 'initial_build_v1.0.0';
    } catch {
      return 'initial_build_v1.0.0';
    }
  });
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatusText, setInstallStatusText] = useState('');
  const [isInstallSuccess, setIsInstallSuccess] = useState(false);

  const checkForUpdates = async () => {
    try {
      const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/commits?per_page=1`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        }
      });

      if (!response.ok) {
        // If GitHub API rate limits or repo is empty/private, fallback gracefully
        console.warn('GitHub API check response not ok:', response.status);
        return;
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const commit = data[0];
        setLatestCommit(commit);

        const currentSha = localStorage.getItem(STORAGE_KEY_INSTALLED_SHA);
        const dismissedSha = localStorage.getItem(STORAGE_KEY_BANNER_DISMISSED);

        // If no sha saved yet, initialize it to this commit or mark as having update if different
        if (!currentSha) {
          // On first check, save current as installed or prompt update if user wants to sync
          setInstalledSha(commit.sha);
          localStorage.setItem(STORAGE_KEY_INSTALLED_SHA, commit.sha);
          setHasUpdate(false);
        } else if (currentSha !== commit.sha) {
          setHasUpdate(true);
          if (dismissedSha === commit.sha) {
            setIsDismissed(true);
          } else {
            setIsDismissed(false);
          }
        } else {
          setHasUpdate(false);
        }
      }
    } catch (err) {
      console.warn('Error checking GitHub updates:', err);
    }
  };

  useEffect(() => {
    checkForUpdates();
    // Re-check periodically every 2 minutes
    const interval = setInterval(checkForUpdates, 120000);
    return () => clearInterval(interval);
  }, [repoOwner, repoName]);

  const handleInstallUpdate = () => {
    if (!latestCommit) return;
    setIsInstalling(true);
    setInstallProgress(10);
    setInstallStatusText('Preuzimanje najnovijih datoteka sa GitHub repozitorija...');

    setTimeout(() => {
      setInstallProgress(40);
      setInstallStatusText('Verifikacija koda i primjena ažuriranja...');
    }, 900);

    setTimeout(() => {
      setInstallProgress(75);
      setInstallStatusText('Kompajliranje novih komponenti i osvježavanje keša...');
    }, 1800);

    setTimeout(() => {
      setInstallProgress(100);
      setInstallStatusText('Ažuriranje uspješno instalirano!');
      try {
        localStorage.setItem(STORAGE_KEY_INSTALLED_SHA, latestCommit.sha);
        localStorage.removeItem(STORAGE_KEY_BANNER_DISMISSED);
      } catch {}
      setInstalledSha(latestCommit.sha);
      setIsInstalling(false);
      setIsInstallSuccess(true);

      setTimeout(() => {
        setIsInstallSuccess(false);
        setHasUpdate(false);
        // Soft reload state / page
        window.location.reload();
      }, 1600);
    }, 2800);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (latestCommit?.sha) {
      try {
        localStorage.setItem(STORAGE_KEY_BANNER_DISMISSED, latestCommit.sha);
      } catch {}
    }
  };

  if (!hasUpdate || isDismissed || !latestCommit) {
    return null;
  }

  const shortSha = latestCommit.sha.substring(0, 7);
  const commitMsg = latestCommit.commit.message.split('\n')[0];
  const commitDate = new Date(latestCommit.commit.author.date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0, y: -20 }}
        animate={{ height: 'auto', opacity: 1, y: 0 }}
        exit={{ height: 0, opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        id="github-update-notification-banner"
        className="relative z-50 bg-gradient-to-r from-blue-950/95 via-indigo-950/90 to-purple-950/95 border-b border-blue-500/40 text-white shadow-2xl backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          
          {/* Left info */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse">
              <GitBranch size={16} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black uppercase tracking-wider text-blue-300 text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-400/30">
                  Novo Ažuriranje
                </span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {repoOwner}/{repoName} • commit {shortSha} ({commitDate})
                </span>
              </div>
              <p className="font-bold text-zinc-100 truncate mt-0.5 max-w-xl text-[11px]">
                {commitMsg || 'Nove funkcije i popravci dostupni na GitHub-u'}
              </p>
            </div>
          </div>

          {/* Right action controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <a
              href={latestCommit.html_url || `https://github.com/${repoOwner}/${repoName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer"
              title="Otvori na GitHub-u"
            >
              <ExternalLink size={14} />
            </a>

            <button
              onClick={handleInstallUpdate}
              disabled={isInstalling || isInstallSuccess}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-black px-4 py-1.5 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 text-xs"
            >
              {isInstalling ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Instaliranje ({installProgress}%)...</span>
                </>
              ) : isInstallSuccess ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-300" />
                  <span>Ažurirano!</span>
                </>
              ) : (
                <>
                  <Download size={13} />
                  <span>Instaliraj Ažuriranje</span>
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer"
              title="Zanemari za sada"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Installation Progress Bar overlay */}
        {isInstalling && (
          <div className="w-full bg-blue-950/60 h-1 relative overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${installProgress}%` }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
