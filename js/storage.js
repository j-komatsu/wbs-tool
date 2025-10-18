/**
 * Storage Manager
 * Handles LocalStorage operations with error handling and auto-backup
 */

const Storage = {
    KEYS: {
        PROJECTS: 'wbs-tool-projects',
        CURRENT_PROJECT: 'wbs-tool-current-project',
        SETTINGS: 'wbs-tool-settings',
        BACKUPS: 'wbs-tool-backups',
        LAST_EXPORT: 'wbs-tool-last-export'
    },

    /**
     * Initialize storage
     */
    init() {
        try {
            // Check if localStorage is available
            if (!this.isAvailable()) {
                throw new Error('LocalStorage is not available');
            }

            // Initialize default data if not exists
            if (!this.get(this.KEYS.PROJECTS)) {
                this.set(this.KEYS.PROJECTS, []);
            }

            if (!this.get(this.KEYS.SETTINGS)) {
                this.set(this.KEYS.SETTINGS, this.getDefaultSettings());
            }

            // Start auto-backup
            this.startAutoBackup();

            // console.log('Storage initialized');
            return true;
        } catch (error) {
            console.error('Storage initialization failed:', error);
            return false;
        }
    },

    /**
     * Check if localStorage is available
     */
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Get item from localStorage
     */
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`Error getting ${key}:`, error);
            return null;
        }
    },

    /**
     * Set item to localStorage with backup on failure
     */
    set(key, value) {
        // Store previous value for rollback
        const previousValue = this.get(key);

        try {
            const jsonString = JSON.stringify(value);

            // Check if the new data will fit
            const estimatedSize = new Blob([jsonString]).size;

            localStorage.setItem(key, jsonString);
            return true;
        } catch (error) {
            // Rollback on error
            if (previousValue !== null && key !== this.KEYS.BACKUPS) {
                try {
                    localStorage.setItem(key, JSON.stringify(previousValue));
                } catch (rollbackError) {
                    console.error('Rollback failed:', rollbackError);
                }
            }

            if (error.name === 'QuotaExceededError') {
                console.error('Storage quota exceeded');
                this.handleQuotaExceeded();
                Utils.showNotification('ストレージ容量が不足しています', 'error');
            } else {
                console.error(`Error setting ${key}:`, error);
                Utils.showNotification('データの保存に失敗しました', 'error');
            }
            return false;
        }
    },

    /**
     * Remove item from localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing ${key}:`, error);
            return false;
        }
    },

    /**
     * Clear all storage
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    },

    /**
     * Get all projects
     */
    getProjects() {
        return this.get(this.KEYS.PROJECTS) || [];
    },

    /**
     * Get project by ID
     */
    getProject(projectId) {
        const projects = this.getProjects();
        return projects.find(p => p.id === projectId);
    },

    /**
     * Save project
     */
    saveProject(project) {
        try {
            const projects = this.getProjects();
            const index = projects.findIndex(p => p.id === project.id);

            project.updatedAt = new Date().toISOString();

            if (index >= 0) {
                projects[index] = project;
            } else {
                project.createdAt = new Date().toISOString();
                projects.push(project);
            }

            this.set(this.KEYS.PROJECTS, projects);

            // Update current project if it's the active one
            const currentProjectId = this.getCurrentProjectId();
            if (currentProjectId === project.id) {
                this.setCurrentProject(project.id);
            }

            return true;
        } catch (error) {
            console.error('Error saving project:', error);
            return false;
        }
    },

    /**
     * Delete project
     */
    deleteProject(projectId) {
        try {
            const projects = this.getProjects();
            const filtered = projects.filter(p => p.id !== projectId);
            this.set(this.KEYS.PROJECTS, filtered);

            // Clear current project if deleted
            if (this.getCurrentProjectId() === projectId) {
                this.remove(this.KEYS.CURRENT_PROJECT);
            }

            return true;
        } catch (error) {
            console.error('Error deleting project:', error);
            return false;
        }
    },

    /**
     * Get current project ID
     */
    getCurrentProjectId() {
        return this.get(this.KEYS.CURRENT_PROJECT);
    },

    /**
     * Set current project
     */
    setCurrentProject(projectId) {
        return this.set(this.KEYS.CURRENT_PROJECT, projectId);
    },

    /**
     * Get current project
     */
    getCurrentProject() {
        const projectId = this.getCurrentProjectId();
        return projectId ? this.getProject(projectId) : null;
    },

    /**
     * Get settings
     */
    getSettings() {
        return this.get(this.KEYS.SETTINGS) || this.getDefaultSettings();
    },

    /**
     * Save settings
     */
    saveSettings(settings) {
        return this.set(this.KEYS.SETTINGS, settings);
    },

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            theme: 'light',
            dateFormat: 'YYYY-MM-DD',
            timeScale: 'day',
            showWeekends: true,
            autoSave: true,
            autoSaveInterval: 3000, // 3 seconds
            language: 'ja',
            autoBackup: true,
            autoBackupInterval: 300000, // 5 minutes
            exportReminder: true,
            exportReminderDays: 7
        };
    },

    /**
     * Create backup
     */
    createBackup() {
        try {
            const backups = this.get(this.KEYS.BACKUPS) || [];
            const backup = {
                id: Utils.generateUUID(),
                timestamp: new Date().toISOString(),
                projects: this.getProjects(),
                settings: this.getSettings()
            };

            backups.unshift(backup);

            // Keep only last 5 backups
            const maxBackups = 5;
            if (backups.length > maxBackups) {
                backups.splice(maxBackups);
            }

            this.set(this.KEYS.BACKUPS, backups);
            // console.log('Backup created:', backup.id);
            return backup;
        } catch (error) {
            console.error('Error creating backup:', error);
            return null;
        }
    },

    /**
     * Get backups
     */
    getBackups() {
        return this.get(this.KEYS.BACKUPS) || [];
    },

    /**
     * Restore from backup
     */
    restoreBackup(backupId) {
        try {
            const backups = this.getBackups();
            const backup = backups.find(b => b.id === backupId);

            if (!backup) {
                throw new Error('Backup not found');
            }

            this.set(this.KEYS.PROJECTS, backup.projects);
            this.set(this.KEYS.SETTINGS, backup.settings);

            // console.log('Backup restored:', backupId);
            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    },

    /**
     * Start auto-backup
     */
    startAutoBackup() {
        const settings = this.getSettings();
        if (settings.autoBackup === false) {
            // console.log('Auto-backup is disabled');
            return;
        }

        const interval = settings.autoBackupInterval || 300000; // Default: 5 minutes
        this.autoBackupTimer = setInterval(() => {
            this.createBackup();
        }, interval);

        // console.log(`Auto-backup started (interval: ${interval}ms)`);
    },

    /**
     * Stop auto-backup
     */
    stopAutoBackup() {
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
            this.autoBackupTimer = null;
            // console.log('Auto-backup stopped');
        }
    },

    /**
     * Restart auto-backup with new interval
     */
    restartAutoBackup(interval) {
        this.stopAutoBackup();
        const settings = this.getSettings();
        settings.autoBackupInterval = interval;
        this.saveSettings(settings);
        this.startAutoBackup();
    },

    /**
     * Handle quota exceeded
     */
    handleQuotaExceeded() {
        // Try to free up space by removing old backups
        const backups = this.getBackups();
        if (backups.length > 1) {
            backups.pop(); // Remove oldest backup
            this.set(this.KEYS.BACKUPS, backups);
            Utils.showNotification('ストレージ容量不足のため、古いバックアップを削除しました', 'warning');
        } else {
            Utils.showNotification('ストレージ容量が不足しています。不要なプロジェクトを削除してください。', 'error');
        }
    },

    /**
     * Get storage usage (LocalStorage specific)
     */
    async getStorageUsage() {
        // Calculate LocalStorage size directly
        const localStorageSize = this.getLocalStorageSize();

        // For LocalStorage, use the estimated 10MB quota
        // (navigator.storage.estimate() returns total storage quota which is too large)
        return localStorageSize;
    },

    /**
     * Get LocalStorage size (fallback method)
     */
    getLocalStorageSize() {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }

            // Estimate quota (most browsers: 5-10MB for localStorage)
            const estimatedQuota = 10 * 1024 * 1024; // 10MB

            return {
                usage: total * 2, // UTF-16 encoding
                quota: estimatedQuota,
                percentage: (total * 2 / estimatedQuota) * 100,
                usageFormatted: this.formatBytes(total * 2),
                quotaFormatted: this.formatBytes(estimatedQuota),
                isEstimate: true
            };
        } catch (error) {
            console.error('Error calculating localStorage size:', error);
            return null;
        }
    },

    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Check storage quota and warn if needed
     */
    async checkQuota() {
        const usage = await this.getStorageUsage();
        if (usage && usage.percentage > 80) {
            Utils.showNotification(
                `ストレージ使用量が${Math.round(usage.percentage)}%を超えています`,
                'warning'
            );
        }
    },

    /**
     * Export all data
     */
    exportAll() {
        // Record export timestamp
        this.recordExport();

        return {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            projects: this.getProjects(),
            settings: this.getSettings()
        };
    },

    /**
     * Record export timestamp
     */
    recordExport() {
        const timestamp = new Date().toISOString();
        this.set(this.KEYS.LAST_EXPORT, timestamp);
        // console.log('Export recorded:', timestamp);
    },

    /**
     * Get last export date
     */
    getLastExportDate() {
        return this.get(this.KEYS.LAST_EXPORT);
    },

    /**
     * Get days since last export
     */
    getDaysSinceLastExport() {
        const lastExport = this.getLastExportDate();
        if (!lastExport) {
            return null; // Never exported
        }

        const lastExportDate = new Date(lastExport);
        const now = new Date();
        const diffTime = Math.abs(now - lastExportDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    },

    /**
     * Check if export reminder should be shown
     */
    shouldShowExportReminder() {
        const settings = this.getSettings();
        const reminderDays = settings.exportReminderDays || 7;
        const days = this.getDaysSinceLastExport();

        // Never exported
        if (days === null) {
            const projects = this.getProjects();
            // Show reminder if there are projects and never exported
            return projects.length > 0;
        }

        // Show reminder if more than configured days since last export
        return days >= reminderDays;
    },

    /**
     * Import data
     */
    importAll(data) {
        try {
            if (!data.version || !data.projects) {
                throw new Error('Invalid import data');
            }

            // Validate data structure
            if (!Array.isArray(data.projects)) {
                throw new Error('Invalid projects data');
            }

            // Backup current data before import
            this.createBackup();

            // Import
            this.set(this.KEYS.PROJECTS, data.projects);
            if (data.settings) {
                this.set(this.KEYS.SETTINGS, data.settings);
            }

            Utils.showNotification('データをインポートしました', 'success');
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            Utils.showNotification('インポートに失敗しました: ' + error.message, 'error');
            return false;
        }
    }
};
