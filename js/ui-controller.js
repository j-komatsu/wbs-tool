/**
 * UI Controller
 * Manages UI interactions and rendering
 */

const UIController = {
    currentView: 'gantt',
    currentTaskModal: null,
    currentSprintModal: null,

    /**
     * Initialize UI Controller
     */
    init() {
        this.setupEventListeners();
        this.setupModals();
        console.log('UI Controller initialized');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // View tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Toolbar buttons
        document.getElementById('new-task-btn')?.addEventListener('click', () => this.showNewTaskModal());
        document.getElementById('save-btn')?.addEventListener('click', () => this.saveProject());
        document.getElementById('new-project-btn')?.addEventListener('click', () => this.createNewProject());
        document.getElementById('export-btn')?.addEventListener('click', () => ImportExport.showExportDialog());
        document.getElementById('import-btn')?.addEventListener('click', () => ImportExport.showImportDialog());

        // Search and filters
        document.getElementById('search-input')?.addEventListener('input',
            Utils.debounce((e) => this.handleSearch(e.target.value), 300)
        );

        document.getElementById('status-filter')?.addEventListener('change', (e) => {
            this.handleFilter('status', e.target.value);
        });

        document.getElementById('assignee-filter')?.addEventListener('change', (e) => {
            this.handleFilter('assignee', e.target.value);
        });

        // Project selector
        document.getElementById('project-select')?.addEventListener('change', (e) => {
            this.switchProject(e.target.value);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    },

    /**
     * Setup modals
     */
    setupModals() {
        // Task modal
        const taskModal = document.getElementById('task-modal');
        if (taskModal) {
            // Close buttons
            taskModal.querySelector('.modal-close')?.addEventListener('click', () => {
                this.hideTaskModal();
            });

            document.getElementById('task-cancel-btn')?.addEventListener('click', () => {
                this.hideTaskModal();
            });

            // Save button
            document.getElementById('task-save-btn')?.addEventListener('click', () => {
                this.saveTask();
            });

            // Delete button
            document.getElementById('task-delete-btn')?.addEventListener('click', () => {
                this.deleteTask();
            });

            // Click outside to close
            taskModal.addEventListener('click', (e) => {
                if (e.target === taskModal) {
                    this.hideTaskModal();
                }
            });
        }

        // Sprint modal
        const sprintModal = document.getElementById('sprint-modal');
        if (sprintModal) {
            sprintModal.querySelector('.modal-close')?.addEventListener('click', () => {
                this.hideSprintModal();
            });

            document.getElementById('sprint-cancel-btn')?.addEventListener('click', () => {
                this.hideSprintModal();
            });

            document.getElementById('sprint-save-btn')?.addEventListener('click', () => {
                this.saveSprint();
            });

            sprintModal.addEventListener('click', (e) => {
                if (e.target === sprintModal) {
                    this.hideSprintModal();
                }
            });
        }
    },

    /**
     * Switch view
     */
    switchView(view) {
        this.currentView = view;

        // Update tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });

        // Update view containers
        document.querySelectorAll('.view-container').forEach(container => {
            container.classList.remove('active');
        });

        document.getElementById(`${view}-view`)?.classList.add('active');

        // Render appropriate view
        switch (view) {
            case 'gantt':
                this.renderGanttView();
                break;
            case 'kanban':
                this.renderKanbanView();
                break;
            case 'backlog':
                this.renderBacklogView();
                break;
            case 'dashboard':
                this.renderDashboardView();
                break;
            case 'report':
                this.renderReportView();
                break;
        }
    },

    /**
     * Render Gantt view
     */
    renderGanttView() {
        this.renderWBSList();
        this.renderGanttChart();
    },

    /**
     * Render WBS list
     */
    renderWBSList() {
        const container = document.getElementById('wbs-list');
        if (!container) return;

        const tasks = WBSManager.getTaskHierarchy();

        if (tasks.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #94a3b8;">
                    <p>タスクがありません</p>
                    <p style="margin-top: 8px; font-size: 13px;">「新規タスク」ボタンからタスクを作成してください</p>
                </div>
            `;
            return;
        }

        let html = '';

        tasks.forEach(task => {
            // Skip if parent is collapsed
            if (task.parentId && WBSManager.isCollapsed(task.parentId)) {
                return;
            }

            html += this.renderTaskRow(task);
        });

        container.innerHTML = html;

        // Add event listeners
        this.attachTaskRowListeners();
    },

    /**
     * Render task row
     */
    renderTaskRow(task) {
        const indent = task.level * 20;
        const hasChildren = WBSManager.getTasks().some(t => t.parentId === task.id);
        const isCollapsed = WBSManager.isCollapsed(task.id);

        let html = `<div class="wbs-task" data-task-id="${task.id}">`;

        // Task name with hierarchy
        html += `<div class="wbs-task-name wbs-col wbs-col-name">`;

        // Indent
        if (indent > 0) {
            html += `<span class="wbs-task-indent" style="width: ${indent}px"></span>`;
        }

        // Toggle button for parents
        if (hasChildren) {
            const toggleClass = isCollapsed ? 'collapsed' : 'expanded';
            html += `<button class="wbs-task-toggle ${toggleClass}" data-task-id="${task.id}"></button>`;
        } else {
            html += `<span style="width: 16px; display: inline-block;"></span>`;
        }

        // Task icon
        const icon = this.getTaskIcon(task.type);
        html += `<span class="wbs-task-icon">${icon}</span>`;

        // Task name
        html += `<span class="wbs-task-text">${Utils.escapeHTML(task.name)}</span>`;
        html += `</div>`;

        // Type
        html += `<div class="wbs-col wbs-col-type"><span class="wbs-task-type task-type-${task.type}">${this.getTaskTypeLabel(task.type)}</span></div>`;

        // Story points
        html += `<div class="wbs-col wbs-col-points wbs-task-points">${task.storyPoints || '-'}</div>`;

        // Assignee
        html += `<div class="wbs-col wbs-col-assignee wbs-task-assignee">${Utils.escapeHTML(task.assignee || '')}</div>`;

        // Start date
        html += `<div class="wbs-col wbs-col-start wbs-task-date">${task.startDate || ''}</div>`;

        // End date
        html += `<div class="wbs-col wbs-col-end wbs-task-date">${task.endDate || ''}</div>`;

        // Progress
        html += `<div class="wbs-col wbs-col-progress wbs-task-progress">`;
        html += `<div class="progress-bar-container">`;
        html += `<div class="progress-bar" style="width: ${task.progress}%"></div>`;
        html += `</div>`;
        html += `</div>`;

        html += `</div>`;

        return html;
    },

    /**
     * Attach event listeners to task rows
     */
    attachTaskRowListeners() {
        // Double click to edit
        document.querySelectorAll('.wbs-task').forEach(row => {
            row.addEventListener('dblclick', (e) => {
                const taskId = e.currentTarget.dataset.taskId;
                this.showEditTaskModal(taskId);
            });
        });

        // Toggle collapse
        document.querySelectorAll('.wbs-task-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = e.target.dataset.taskId;
                WBSManager.toggleCollapse(taskId);
                this.renderWBSList();
            });
        });
    },

    /**
     * Render Gantt chart
     */
    renderGanttChart() {
        const tasks = WBSManager.getFilteredTasks();
        GanttRenderer.renderTimelineHeader();
        GanttRenderer.render(tasks);
    },

    /**
     * Render Kanban view
     */
    renderKanbanView() {
        if (typeof KanbanBoard !== 'undefined') {
            KanbanBoard.render();
        } else {
            console.error('KanbanBoard module not loaded');
        }
    },

    /**
     * Render Backlog view (placeholder for MVP)
     */
    renderBacklogView() {
        const container = document.getElementById('backlog-view');
        if (container) {
            container.innerHTML = '<div style="padding: 40px; text-align: center;">バックログビューは開発中です</div>';
        }
    },

    /**
     * Render Dashboard view (placeholder for MVP)
     */
    renderDashboardView() {
        const container = document.getElementById('dashboard-view');
        if (container) {
            this.renderDashboardKPIs();
        }
    },

    /**
     * Render dashboard KPIs
     */
    renderDashboardKPIs() {
        const stats = WBSManager.getStatistics();

        document.getElementById('project-progress').textContent = `${stats.progress}%`;
        document.getElementById('completed-tasks').textContent = stats.done;
        document.getElementById('total-tasks').textContent = stats.total;
        document.getElementById('delayed-tasks').textContent = stats.overdue;
    },

    /**
     * Render Report view (placeholder for MVP)
     */
    renderReportView() {
        const container = document.getElementById('report-content');
        if (container) {
            container.innerHTML = '<div style="padding: 40px; text-align: center;">レポート機能は開発中です</div>';
        }
    },

    /**
     * Show new task modal
     */
    showNewTaskModal() {
        this.currentTaskModal = null;

        document.getElementById('task-modal-title').textContent = '新規タスク';
        document.getElementById('task-name').value = '';
        document.getElementById('task-type').value = 'task';
        document.getElementById('task-status').value = 'todo';
        document.getElementById('task-priority').value = 'medium';
        document.getElementById('task-start-date').value = '';
        document.getElementById('task-end-date').value = '';
        document.getElementById('task-progress').value = '0';
        document.getElementById('task-story-points').value = '';
        document.getElementById('task-assignee').value = '';
        document.getElementById('task-description').value = '';
        document.getElementById('task-acceptance-criteria').value = '';

        this.updateParentTaskSelect();

        document.getElementById('task-delete-btn').style.display = 'none';

        document.getElementById('task-modal').classList.add('active');
    },

    /**
     * Show edit task modal
     */
    showEditTaskModal(taskId) {
        const task = WBSManager.getTask(taskId);
        if (!task) return;

        this.currentTaskModal = task;

        document.getElementById('task-modal-title').textContent = 'タスク編集';
        document.getElementById('task-name').value = task.name;
        document.getElementById('task-type').value = task.type;
        document.getElementById('task-status').value = task.status;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-start-date').value = task.startDate || '';
        document.getElementById('task-end-date').value = task.endDate || '';
        document.getElementById('task-progress').value = task.progress;
        document.getElementById('task-story-points').value = task.storyPoints || '';
        document.getElementById('task-assignee').value = task.assignee || '';
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-acceptance-criteria').value = task.acceptanceCriteria || '';

        this.updateParentTaskSelect(task.id, task.parentId);

        document.getElementById('task-delete-btn').style.display = 'inline-block';

        document.getElementById('task-modal').classList.add('active');
    },

    /**
     * Hide task modal
     */
    hideTaskModal() {
        document.getElementById('task-modal').classList.remove('active');
        this.currentTaskModal = null;
    },

    /**
     * Save task
     */
    saveTask() {
        const name = document.getElementById('task-name').value.trim();
        if (!name) {
            Utils.showNotification('タスク名を入力してください', 'error');
            return;
        }

        const parentId = document.getElementById('task-parent').value || null;

        const taskData = {
            name: name,
            type: document.getElementById('task-type').value,
            status: document.getElementById('task-status').value,
            priority: document.getElementById('task-priority').value,
            startDate: document.getElementById('task-start-date').value || null,
            endDate: document.getElementById('task-end-date').value || null,
            progress: parseInt(document.getElementById('task-progress').value) || 0,
            storyPoints: parseInt(document.getElementById('task-story-points').value) || null,
            assignee: document.getElementById('task-assignee').value || null,
            description: document.getElementById('task-description').value || '',
            acceptanceCriteria: document.getElementById('task-acceptance-criteria').value || '',
            parentId: parentId
        };

        if (this.currentTaskModal) {
            // Update existing task
            WBSManager.updateTask(this.currentTaskModal.id, taskData);
        } else {
            // Create new task
            const newTask = DataModel.createTask(taskData.name);
            Object.assign(newTask, taskData);
            WBSManager.addTask(newTask);
        }

        this.hideTaskModal();
        this.refresh();
    },

    /**
     * Delete task
     */
    deleteTask() {
        if (!this.currentTaskModal) return;

        if (Utils.confirm('このタスクを削除しますか？')) {
            WBSManager.deleteTask(this.currentTaskModal.id);
            this.hideTaskModal();
            this.refresh();
        }
    },

    /**
     * Handle search
     */
    handleSearch(query) {
        WBSManager.setFilters({ search: query });
        this.refresh();
    },

    /**
     * Handle filter
     */
    handleFilter(filterType, value) {
        const filters = {};
        filters[filterType] = value;
        WBSManager.setFilters(filters);
        this.refresh();
    },

    /**
     * Save project
     */
    saveProject() {
        if (WBSManager.save()) {
            Utils.showNotification('保存しました', 'success');
            this.updateSaveStatus();
        } else {
            Utils.showNotification('保存に失敗しました', 'error');
        }
    },

    /**
     * Create new project
     */
    createNewProject() {
        const name = prompt('プロジェクト名を入力してください', '新規プロジェクト');
        if (!name) return;

        const project = DataModel.createProject(name);
        Storage.saveProject(project);
        Storage.setCurrentProject(project.id);

        this.loadProject(project.id);
        this.updateProjectSelector();
    },

    /**
     * Switch project
     */
    switchProject(projectId) {
        if (!projectId) return;

        Storage.setCurrentProject(projectId);
        this.loadProject(projectId);
    },

    /**
     * Load project
     */
    loadProject(projectId) {
        const project = Storage.getProject(projectId);
        if (!project) {
            Utils.showNotification('プロジェクトが見つかりません', 'error');
            return;
        }

        WBSManager.init(project);
        GanttRenderer.init();
        this.refresh();

        Utils.showNotification(`${project.name} を読み込みました`, 'success');
    },

    /**
     * Update project selector
     */
    updateProjectSelector() {
        const select = document.getElementById('project-select');
        if (!select) return;

        const projects = Storage.getProjects();
        const currentId = Storage.getCurrentProjectId();

        let html = '<option value="">プロジェクトを選択...</option>';
        projects.forEach(project => {
            const selected = project.id === currentId ? 'selected' : '';
            html += `<option value="${project.id}" ${selected}>${Utils.escapeHTML(project.name)}</option>`;
        });

        select.innerHTML = html;
    },

    /**
     * Update save status
     */
    updateSaveStatus() {
        const status = document.getElementById('save-status');
        if (!status) return;

        const now = new Date();
        status.textContent = `最終保存: ${Utils.formatDateTime(now)}`;
    },

    /**
     * Update task count
     */
    updateTaskCount() {
        const info = document.getElementById('task-count-info');
        if (!info) return;

        const stats = WBSManager.getStatistics();
        info.textContent = `タスク数: ${stats.total}`;
    },

    /**
     * Refresh view
     */
    refresh() {
        this.switchView(this.currentView);
        this.updateTaskCount();
        this.updateProjectSelector();
    },

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd + N: New task
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.showNewTaskModal();
        }

        // Ctrl/Cmd + S: Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveProject();
        }
    },

    /**
     * Get task icon
     */
    getTaskIcon(type) {
        const icons = {
            epic: '📦',
            story: '📖',
            task: '📋',
            bug: '🐛'
        };
        return icons[type] || '📋';
    },

    /**
     * Get task type label
     */
    getTaskTypeLabel(type) {
        const labels = {
            epic: 'Epic',
            story: 'Story',
            task: 'Task',
            bug: 'Bug'
        };
        return labels[type] || type;
    },

    /**
     * Hide sprint modal (placeholder)
     */
    hideSprintModal() {
        document.getElementById('sprint-modal')?.classList.remove('active');
    },

    /**
     * Save sprint (placeholder)
     */
    saveSprint() {
        // MVP: Not implemented
        this.hideSprintModal();
    },

    /**
     * Update parent task select dropdown
     */
    updateParentTaskSelect(currentTaskId = null, selectedParentId = null) {
        const select = document.getElementById('task-parent');
        if (!select) return;

        const tasks = WBSManager.getTasks();
        let html = '<option value="">なし（最上位）</option>';

        // Get task hierarchy
        const hierarchy = DataModel.getTaskHierarchy(tasks);

        hierarchy.forEach(task => {
            // Skip current task and its descendants
            if (currentTaskId) {
                if (task.id === currentTaskId) return;

                const descendantIds = DataModel.getDescendantIds(tasks, currentTaskId);
                if (descendantIds.includes(task.id)) return;
            }

            // Add indent for visual hierarchy
            const indent = '　'.repeat(task.level || 0);
            const selected = task.id === selectedParentId ? 'selected' : '';

            html += `<option value="${task.id}" ${selected}>${indent}${Utils.escapeHTML(task.name)}</option>`;
        });

        select.innerHTML = html;
    }
};
