/**
 * Main Application
 * Application initialization and lifecycle management
 */

const App = {
    version: '0.1.0-mvp',
    initialized: false,

    /**
     * Initialize application
     */
    async init() {
        try {
            console.log(`WBS Tool v${this.version} - Initializing...`);

            // Initialize storage
            if (!Storage.init()) {
                throw new Error('Failed to initialize storage');
            }

            // Check storage quota
            await Storage.checkQuota();

            // Initialize components
            UIController.init();
            GanttRenderer.init();
            if (typeof KanbanBoard !== 'undefined') {
                KanbanBoard.init();
            }

            // Load or create project
            await this.loadInitialProject();

            // Setup auto-save
            this.setupAutoSave();

            // Setup before unload warning
            this.setupBeforeUnload();

            // Mark as initialized
            this.initialized = true;

            console.log('WBS Tool initialized successfully');

            // Show welcome message for first-time users
            this.checkFirstVisit();

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showFatalError(error);
        }
    },

    /**
     * Load initial project
     */
    async loadInitialProject() {
        // Try to load current project
        let currentProject = Storage.getCurrentProject();

        if (!currentProject) {
            // Check if there are any projects
            const projects = Storage.getProjects();

            if (projects.length > 0) {
                // Load first project
                currentProject = projects[0];
                Storage.setCurrentProject(currentProject.id);
            } else {
                // Create default project
                currentProject = this.createDefaultProject();
            }
        }

        // Initialize WBS Manager with project
        WBSManager.init(currentProject);

        // Update UI
        UIController.updateProjectSelector();
        UIController.refresh();
    },

    /**
     * Create default project with sample data
     */
    createDefaultProject() {
        const project = DataModel.createProject('サンプルプロジェクト');

        // Add sample tasks
        const sampleTasks = this.createSampleTasks();
        project.tasks = sampleTasks;

        // Save project
        Storage.saveProject(project);
        Storage.setCurrentProject(project.id);

        Utils.showNotification('サンプルプロジェクトを作成しました', 'success');

        return project;
    },

    /**
     * Create sample tasks for demonstration
     */
    createSampleTasks() {
        const tasks = [];

        // Epic 1
        const epic1 = DataModel.createTask('プロジェクト計画', null);
        epic1.type = 'epic';
        epic1.startDate = Utils.formatDate(new Date());
        epic1.endDate = Utils.formatDate(Utils.addDays(new Date(), 30));
        epic1.storyPoints = 21;
        epic1.status = 'in_progress';
        epic1.progress = 50;
        tasks.push(epic1);

        // Story 1-1
        const story1 = DataModel.createTask('要件定義', epic1.id);
        story1.type = 'story';
        story1.startDate = Utils.formatDate(new Date());
        story1.endDate = Utils.formatDate(Utils.addDays(new Date(), 7));
        story1.storyPoints = 5;
        story1.status = 'done';
        story1.progress = 100;
        story1.assignee = '田中';
        tasks.push(story1);

        // Task 1-1-1
        const task1 = DataModel.createTask('要件ヒアリング', story1.id);
        task1.startDate = Utils.formatDate(new Date());
        task1.endDate = Utils.formatDate(Utils.addDays(new Date(), 3));
        task1.storyPoints = 2;
        task1.status = 'done';
        task1.progress = 100;
        task1.assignee = '田中';
        tasks.push(task1);

        // Task 1-1-2
        const task2 = DataModel.createTask('要件書作成', story1.id);
        task2.startDate = Utils.formatDate(Utils.addDays(new Date(), 3));
        task2.endDate = Utils.formatDate(Utils.addDays(new Date(), 7));
        task2.storyPoints = 3;
        task2.status = 'done';
        task2.progress = 100;
        task2.assignee = '田中';
        tasks.push(task2);

        // Story 1-2
        const story2 = DataModel.createTask('基本設計', epic1.id);
        story2.type = 'story';
        story2.startDate = Utils.formatDate(Utils.addDays(new Date(), 7));
        story2.endDate = Utils.formatDate(Utils.addDays(new Date(), 14));
        story2.storyPoints = 8;
        story2.status = 'in_progress';
        story2.progress = 30;
        story2.assignee = '佐藤';
        tasks.push(story2);

        // Epic 2
        const epic2 = DataModel.createTask('開発', null);
        epic2.type = 'epic';
        epic2.startDate = Utils.formatDate(Utils.addDays(new Date(), 14));
        epic2.endDate = Utils.formatDate(Utils.addDays(new Date(), 45));
        epic2.storyPoints = 34;
        epic2.status = 'todo';
        epic2.progress = 0;
        tasks.push(epic2);

        // Story 2-1
        const story3 = DataModel.createTask('フロントエンド開発', epic2.id);
        story3.type = 'story';
        story3.startDate = Utils.formatDate(Utils.addDays(new Date(), 14));
        story3.endDate = Utils.formatDate(Utils.addDays(new Date(), 28));
        story3.storyPoints = 13;
        story3.status = 'todo';
        story3.progress = 0;
        story3.assignee = '鈴木';
        tasks.push(story3);

        // Bug
        const bug1 = DataModel.createTask('ログイン画面のバグ修正', null);
        bug1.type = 'bug';
        bug1.priority = 'high';
        bug1.startDate = Utils.formatDate(new Date());
        bug1.endDate = Utils.formatDate(Utils.addDays(new Date(), 2));
        bug1.storyPoints = 2;
        bug1.status = 'in_progress';
        bug1.progress = 60;
        bug1.assignee = '鈴木';
        tasks.push(bug1);

        return tasks;
    },

    /**
     * Setup auto-save
     */
    setupAutoSave() {
        const settings = Storage.getSettings();
        if (!settings.autoSave) return;

        setInterval(() => {
            if (this.initialized && WBSManager.currentProject) {
                WBSManager.save();
                UIController.updateSaveStatus();
            }
        }, settings.autoSaveInterval);
    },

    /**
     * Setup before unload warning
     */
    setupBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            // Note: Modern browsers ignore custom messages
            // This will show a generic browser message if there are unsaved changes
            // For MVP, we auto-save so this is mainly for user awareness
        });
    },

    /**
     * Check first visit
     */
    checkFirstVisit() {
        const hasVisited = localStorage.getItem('wbs-tool-visited');

        if (!hasVisited) {
            localStorage.setItem('wbs-tool-visited', 'true');
            this.showWelcomeMessage();
        }
    },

    /**
     * Show welcome message
     */
    showWelcomeMessage() {
        setTimeout(() => {
            Utils.showNotification('WBS Toolへようこそ！サンプルプロジェクトで機能を試してください', 'info');
        }, 500);
    },

    /**
     * Show fatal error
     */
    showFatalError(error) {
        const errorHtml = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                max-width: 500px;
                text-align: center;
            ">
                <h2 style="color: #ef4444; margin-bottom: 16px;">エラーが発生しました</h2>
                <p style="color: #64748b; margin-bottom: 24px;">
                    アプリケーションの初期化に失敗しました。<br>
                    ブラウザをリロードしてください。
                </p>
                <button onclick="location.reload()" style="
                    padding: 12px 24px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">
                    リロード
                </button>
                <details style="margin-top: 20px; text-align: left;">
                    <summary style="cursor: pointer; color: #64748b;">詳細</summary>
                    <pre style="
                        margin-top: 12px;
                        padding: 12px;
                        background: #f1f5f9;
                        border-radius: 4px;
                        font-size: 12px;
                        overflow: auto;
                    ">${error.message}\n${error.stack}</pre>
                </details>
            </div>
        `;

        document.body.innerHTML = errorHtml;
    },

    /**
     * Handle errors globally
     */
    handleError(error) {
        console.error('Application error:', error);
        Utils.showNotification('エラーが発生しました: ' + error.message, 'error');
    }
};

// Global error handler
window.addEventListener('error', (event) => {
    App.handleError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    App.handleError(event.reason);
});

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
    });
} else {
    App.init();
}
