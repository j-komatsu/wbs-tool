/**
 * Error Handler
 * Handles offline detection, storage errors, and user warnings
 */

const ErrorHandler = {
    isOnline: navigator.onLine,
    warningBanner: null,

    /**
     * Initialize error handler
     */
    init() {
        this.setupOfflineDetection();
        this.setupBeforeUnload();
        this.checkStorageOnStartup();
        // console.log('Error Handler initialized');
    },

    /**
     * Setup offline/online detection
     */
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.hideWarningBanner();
            Utils.showNotification('オンラインに復帰しました', 'success');
            // console.log('Network: Online');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showWarningBanner('オフラインモードです。変更は保存されていますが、外部サービスとの同期はできません。');
            // console.log('Network: Offline');
        });

        // Check initial state
        if (!this.isOnline) {
            this.showWarningBanner('オフラインモードです。変更は保存されていますが、外部サービスとの同期はできません。');
        }
    },

    /**
     * Setup beforeunload handler for backup before closing
     */
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            // Create a backup before closing
            try {
                Storage.createBackup();
                // console.log('Backup created on page unload');
            } catch (error) {
                console.error('Failed to create backup on unload:', error);
            }
        });
    },

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        // This would need to track changes in WBSManager
        // For now, return false (can be enhanced later)
        return false;
    },

    /**
     * Check storage on startup
     */
    async checkStorageOnStartup() {
        try {
            const usage = await Storage.getStorageUsage();

            if (!usage) {
                console.warn('Could not get storage usage information');
                return;
            }

            // console.log(`Storage usage: ${usage.usageFormatted} / ${usage.quotaFormatted} (${Math.round(usage.percentage)}%)`);

            // Show warning if usage is high
            if (usage.percentage > 90) {
                this.showWarningBanner(
                    `ストレージ使用量が${Math.round(usage.percentage)}%を超えています。不要なプロジェクトを削除することをお勧めします。`,
                    'error'
                );
            } else if (usage.percentage > 80) {
                Utils.showNotification(
                    `ストレージ使用量: ${Math.round(usage.percentage)}%`,
                    'warning'
                );
            }

            // if (usage.isEstimate) {
            //     console.log('Note: Storage usage is estimated (using localStorage calculation)');
            // }

            // Check export reminder
            this.checkExportReminder();
        } catch (error) {
            console.error('Error checking storage on startup:', error);
        }
    },

    /**
     * Check if export reminder should be shown
     */
    checkExportReminder() {
        try {
            // Check if export reminder is enabled
            const settings = Storage.getSettings();
            if (settings.exportReminder === false) {
                return;
            }

            if (Storage.shouldShowExportReminder()) {
                const days = Storage.getDaysSinceLastExport();

                let message;
                if (days === null) {
                    message = 'データをまだエクスポートしていません。定期的なバックアップをお勧めします。';
                } else {
                    message = `最後のエクスポートから${days}日が経過しています。データをエクスポートしてバックアップすることをお勧めします。`;
                }

                // Show notification after a short delay to avoid crowding startup messages
                setTimeout(() => {
                    this.showExportReminderNotification(message);
                }, 2000);
            }
        } catch (error) {
            console.error('Error checking export reminder:', error);
        }
    },

    /**
     * Show export reminder notification with export button
     */
    showExportReminderNotification(message) {
        // Show notification
        Utils.showNotification(message, 'warning');

        // Show warning banner with export button
        this.showExportReminderBanner(message);
    },

    /**
     * Show export reminder banner with quick export button
     */
    showExportReminderBanner(message) {
        // Remove existing banner if any
        this.hideWarningBanner();

        // Create banner element with export button
        const banner = document.createElement('div');
        banner.id = 'warning-banner';
        banner.className = 'warning-banner warning-banner-info';
        banner.innerHTML = `
            <div class="warning-banner-content">
                <span class="warning-banner-icon">💾</span>
                <span class="warning-banner-message">${message}</span>
                <button class="btn btn-sm btn-primary" onclick="ErrorHandler.quickExport()" style="margin-left: 12px; margin-right: 8px;">今すぐエクスポート</button>
                <button class="warning-banner-close" onclick="ErrorHandler.hideWarningBanner()">✕</button>
            </div>
        `;

        // Insert at the top of the page
        document.body.insertBefore(banner, document.body.firstChild);
        this.warningBanner = banner;

        // Add some padding to the main content
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.style.marginTop = '50px';
        }
    },

    /**
     * Quick export function
     */
    quickExport() {
        try {
            // Get all data
            const data = Storage.exportAll();

            // Create filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `wbs-tool-backup-${timestamp}.json`;

            // Create blob and download
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Hide banner
            this.hideWarningBanner();

            // Show success notification
            Utils.showNotification('データをエクスポートしました', 'success');
        } catch (error) {
            console.error('Error during quick export:', error);
            Utils.showNotification('エクスポートに失敗しました', 'error');
        }
    },

    /**
     * Show warning banner
     */
    showWarningBanner(message, type = 'warning') {
        // Remove existing banner if any
        this.hideWarningBanner();

        // Create banner element
        const banner = document.createElement('div');
        banner.id = 'warning-banner';
        banner.className = `warning-banner warning-banner-${type}`;
        banner.innerHTML = `
            <div class="warning-banner-content">
                <span class="warning-banner-icon">${type === 'error' ? '⚠️' : 'ℹ️'}</span>
                <span class="warning-banner-message">${message}</span>
                <button class="warning-banner-close" onclick="ErrorHandler.hideWarningBanner()">✕</button>
            </div>
        `;

        // Insert at the top of the page
        document.body.insertBefore(banner, document.body.firstChild);
        this.warningBanner = banner;

        // Add some padding to the main content
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.style.marginTop = '50px';
        }
    },

    /**
     * Hide warning banner
     */
    hideWarningBanner() {
        if (this.warningBanner) {
            this.warningBanner.remove();
            this.warningBanner = null;

            // Reset main content margin
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.style.marginTop = '';
            }
        }
    },

    /**
     * Handle storage error
     */
    handleStorageError(error, operation = 'save') {
        console.error(`Storage error during ${operation}:`, error);

        if (error.name === 'QuotaExceededError') {
            this.showWarningBanner(
                'ストレージ容量が不足しています。不要なプロジェクトを削除するか、データをエクスポートしてください。',
                'error'
            );
        } else {
            Utils.showNotification(
                `データの${operation === 'save' ? '保存' : '読み込み'}に失敗しました`,
                'error'
            );
        }
    },

    /**
     * Check storage before save
     */
    async checkStorageBeforeSave() {
        try {
            const usage = await Storage.getStorageUsage();

            if (!usage) {
                return true; // Can't check, proceed anyway
            }

            if (usage.percentage > 95) {
                const confirmed = confirm(
                    `ストレージ使用量が${Math.round(usage.percentage)}%を超えています。\n` +
                    '保存を続行しますか？\n\n' +
                    '（不要なプロジェクトを削除することをお勧めします）'
                );
                return confirmed;
            }

            return true;
        } catch (error) {
            console.error('Error checking storage before save:', error);
            return true; // Proceed on error
        }
    },

    /**
     * Show storage usage info
     */
    async showStorageInfo() {
        try {
            const usage = await Storage.getStorageUsage();

            if (!usage) {
                alert('ストレージ情報を取得できませんでした');
                return;
            }

            // Get last export info
            const lastExport = Storage.getLastExportDate();
            const daysSinceExport = Storage.getDaysSinceLastExport();

            let exportInfo;
            if (lastExport) {
                const exportDate = new Date(lastExport).toLocaleString('ja-JP');
                exportInfo = `最終エクスポート: ${exportDate} (${daysSinceExport}日前)`;
            } else {
                exportInfo = '最終エクスポート: なし';
            }

            const message = `
ストレージ使用状況 (LocalStorage):
━━━━━━━━━━━━━━━━━━━━
使用量: ${usage.usageFormatted}
上限: ${usage.quotaFormatted} (推定)
使用率: ${Math.round(usage.percentage * 10) / 10}%

※ LocalStorageの上限はブラウザによって異なります
  (Chrome/Firefox: 約10MB, Safari: 約5MB)

プロジェクト数: ${Storage.getProjects().length}
バックアップ数: ${Storage.getBackups().length}
${exportInfo}
            `.trim();

            alert(message);
        } catch (error) {
            console.error('Error showing storage info:', error);
            alert('ストレージ情報の取得に失敗しました');
        }
    }
};
