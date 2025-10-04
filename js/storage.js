/**
 * Storage Manager
 * Handles LocalStorage operations with error handling and auto-backup
 */

const Storage = {
    KEYS: {
        PROJECTS: 'wbs-tool-projects',
        CURRENT_PROJECT: 'wbs-tool-current-project',
        SETTINGS: 'wbs-tool-settings',
        BACKUPS: 'wbs-tool-backups'
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

            console.log('Storage initialized');
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
     * Set item to localStorage
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error('Storage quota exceeded');
                this.handleQuotaExceeded();
            } else {
                console.error(`Error setting ${key}:`, error);
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
            language: 'ja'
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
            console.log('Backup created:', backup.id);
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

            console.log('Backup restored:', backupId);
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
        // Create backup every 5 minutes
        setInterval(() => {
            this.createBackup();
        }, 5 * 60 * 1000);
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
     * Get storage usage
     */
    async getStorageUsage() {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    percentage: (estimate.usage / estimate.quota) * 100
                };
            } catch (error) {
                console.error('Error getting storage usage:', error);
                return null;
            }
        }
        return null;
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
        return {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            projects: this.getProjects(),
            settings: this.getSettings()
        };
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
