/**
 * Settings Manager
 * Manages application settings and preferences
 */

const SettingsManager = {
    /**
     * Initialize settings manager
     */
    init() {
        this.setupEventListeners();

        // Apply initial settings on startup
        const settings = Storage.getSettings();
        this.applySettings(settings);

        // console.log('Settings Manager initialized');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openModal());
        }

        // Tab switching
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Close modal on outside click
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    },

    /**
     * Open settings modal
     */
    openModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.loadSettings();
        }
    },

    /**
     * Close settings modal
     */
    closeModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    /**
     * Switch tab
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.dataset.tab === tabName) {
                content.classList.add('active');
            }
        });
    },

    /**
     * Load settings from storage
     */
    loadSettings() {
        const settings = Storage.getSettings();

        // Backup settings
        document.getElementById('setting-auto-backup').checked = settings.autoBackup !== false;
        document.getElementById('setting-backup-interval').value = settings.autoBackupInterval || 300000;
        document.getElementById('setting-export-reminder').checked = settings.exportReminder !== false;
        document.getElementById('setting-reminder-interval').value = settings.exportReminderDays || 7;

        // Display settings
        document.getElementById('setting-dark-mode').checked = settings.theme === 'dark';
        document.getElementById('setting-date-format').value = settings.dateFormat || 'YYYY-MM-DD';
        document.getElementById('setting-show-weekends').checked = settings.showWeekends !== false;

        // General settings
        document.getElementById('setting-language').value = settings.language || 'ja';
        document.getElementById('setting-auto-save').checked = settings.autoSave !== false;
    },

    /**
     * Save settings to storage
     */
    saveSettings() {
        const settings = Storage.getSettings();

        // Backup settings
        settings.autoBackup = document.getElementById('setting-auto-backup').checked;
        settings.autoBackupInterval = parseInt(document.getElementById('setting-backup-interval').value);
        settings.exportReminder = document.getElementById('setting-export-reminder').checked;
        settings.exportReminderDays = parseInt(document.getElementById('setting-reminder-interval').value);

        // Display settings
        const darkMode = document.getElementById('setting-dark-mode').checked;
        settings.theme = darkMode ? 'dark' : 'light';
        settings.dateFormat = document.getElementById('setting-date-format').value;
        settings.showWeekends = document.getElementById('setting-show-weekends').checked;

        // General settings
        settings.language = document.getElementById('setting-language').value;
        settings.autoSave = document.getElementById('setting-auto-save').checked;
        settings.autoSaveInterval = settings.autoSave ? 3000 : 0;

        // Save to storage
        Storage.saveSettings(settings);

        // Apply settings
        this.applySettings(settings);

        // Close modal
        this.closeModal();

        // Show notification with reload suggestion
        Utils.showNotification('設定を保存しました。一部の設定はページのリロード後に反映されます。', 'success');

        // console.log('Settings saved:', settings);
    },

    /**
     * Apply settings to the application
     */
    applySettings(settings) {
        // console.log('Applying settings:', settings);

        // Apply dark mode
        if (settings.theme === 'dark') {
            document.body.classList.add('dark-mode');
            // console.log('Dark mode enabled');
        } else {
            document.body.classList.remove('dark-mode');
            // console.log('Dark mode disabled');
        }

        // Restart auto-backup with new interval
        if (settings.autoBackup !== false) {
            Storage.restartAutoBackup(settings.autoBackupInterval);
            // console.log('Auto-backup enabled, interval:', settings.autoBackupInterval);
        } else {
            Storage.stopAutoBackup();
            // console.log('Auto-backup disabled');
        }

        // Update auto-save interval
        if (typeof App !== 'undefined' && App.setupAutoSave) {
            App.setupAutoSave();
        }

        // Refresh UI to apply visual settings (weekend display, etc.)
        if (typeof UIController !== 'undefined' && UIController.refresh) {
            UIController.refresh();
            // console.log('UI refreshed to apply settings');
        }

        // console.log('Settings applied successfully');
    },

    /**
     * Get current settings
     */
    getSettings() {
        return Storage.getSettings();
    }
};
