/**
 * UI Controller
 * Manages UI interactions and rendering
 */

const UIController = {
    currentView: 'gantt',
    currentTaskModal: null,
    currentSprintModal: null,
    progressDisplayMode: 'chart', // 'chart' | 'percentage'

    /**
     * Initialize UI Controller
     */
    init() {
        this.setupEventListeners();
        this.setupModals();
        this.setupProgressToggle();
        this.setupColumnResize();
        this.setupResetColumnWidth();
        this.setupPanelResize();

        // Force initial panel width and column widths
        const wbsPanel = document.querySelector('.wbs-list-panel');
        if (wbsPanel) {
            wbsPanel.style.setProperty('width', '852px', 'important');
            wbsPanel.style.setProperty('max-width', '852px', 'important');
            wbsPanel.style.setProperty('flex-basis', '852px', 'important');
        }

        // Apply default column widths on initial load
        const defaultWidths = {
            'name': '315px',
            'type': '64px',
            'points': '65px',
            'assignee': '139px',
            'start': '100px',
            'end': '100px'
        };

        Object.keys(defaultWidths).forEach(colName => {
            const cols = document.querySelectorAll(`.wbs-col-${colName}`);
            cols.forEach(col => {
                col.style.width = defaultWidths[colName];
                col.style.minWidth = defaultWidths[colName];
                col.style.maxWidth = defaultWidths[colName];
                col.style.flexShrink = '0';
                col.style.flexGrow = '0';
            });
        });

        // Log initial widths
        setTimeout(() => {
            this.logColumnWidths();
        }, 100);
    },

    /**
     * Setup progress display toggle
     */
    setupProgressToggle() {
        const progressHeader = document.getElementById('progress-header');
        if (progressHeader) {
            progressHeader.addEventListener('click', () => {
                // Toggle mode
                this.progressDisplayMode = this.progressDisplayMode === 'chart' ? 'percentage' : 'chart';

                // Update indicator
                const indicator = document.getElementById('progress-mode-indicator');
                if (indicator) {
                    indicator.textContent = this.progressDisplayMode === 'chart' ? '📊' : '%';
                }

                // Re-render WBS list
                this.renderWBSList();
            });
        }
    },

    /**
     * Setup column resize functionality
     */
    setupColumnResize() {
        const headerRow = document.querySelector('.wbs-header-row-2');
        if (!headerRow) {
            // console.log('Header row not found for resize');
            return;
        }

        let isResizing = false;
        let currentColName = null;
        let startX = 0;
        let startWidth = 0;

        const getOrCreateStyleTag = () => {
            let styleTag = document.getElementById('wbs-column-widths');
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'wbs-column-widths';
                document.head.appendChild(styleTag);
            }
            return styleTag;
        };

        const updateColumnWidth = (colName, width) => {
            const minWidth = 50;
            const finalWidth = Math.max(minWidth, width);
            const cssClassName = `.wbs-col-${colName}`;

            // Get or create style tag each time
            const styleTag = getOrCreateStyleTag();

            // Check if sheet is accessible
            const sheet = styleTag.sheet;
            if (!sheet) {
                console.error('StyleSheet not accessible');
                return;
            }

            // Remove existing rule if present
            try {
                for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
                    if (sheet.cssRules[i].selectorText === cssClassName) {
                        sheet.deleteRule(i);
                    }
                }

                // Add new rule with max-width to force content overflow
                sheet.insertRule(`${cssClassName} { width: ${finalWidth}px !important; min-width: ${finalWidth}px !important; max-width: ${finalWidth}px !important; }`, 0);
            } catch (e) {
                console.error('Error updating column width:', e);
            }
        };

        // Handle mouse down on resize handles
        const onMouseDown = (e) => {
            const handle = e.target;
            if (!handle.classList.contains('resize-handle')) return;

            e.preventDefault();
            e.stopPropagation();

            // Resize the column that contains this handle
            const column = handle.parentElement;
            currentColName = column.dataset.col;

            if (!currentColName) {
                console.error('Column name not found');
                return;
            }

            startX = e.pageX;
            startWidth = column.offsetWidth;
            isResizing = true;

            handle.classList.add('resizing');
            document.body.classList.add('resizing-column');

            // console.log(`Start resizing column: ${currentColName}, width: ${startWidth}px`);
        };

        // Handle mouse move
        const onMouseMove = (e) => {
            if (!isResizing || !currentColName) return;

            e.preventDefault();
            const diff = e.pageX - startX;
            const newWidth = startWidth + diff;

            updateColumnWidth(currentColName, newWidth);
        };

        // Handle mouse up
        const onMouseUp = () => {
            if (isResizing) {
                // console.log(`Stop resizing column: ${currentColName}`);

                isResizing = false;
                currentColName = null;

                document.body.classList.remove('resizing-column');

                // Remove resizing class from all handles
                document.querySelectorAll('.resize-handle.resizing').forEach(h => {
                    h.classList.remove('resizing');
                });
            }
        };

        // Attach event listeners
        headerRow.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // console.log('Column resize initialized');
    },

    /**
     * Setup reset column width button
     */
    setupResetColumnWidth() {
        const resetBtn = document.getElementById('reset-column-width-btn');
        if (!resetBtn) return;

        resetBtn.addEventListener('click', () => {
            // Remove custom width styles
            const styleTag = document.getElementById('wbs-column-widths');
            if (styleTag) {
                styleTag.remove();
            }

            // Force apply default widths with inline styles
            const defaultWidths = {
                'name': '315px',
                'type': '64px',
                'points': '65px',
                'assignee': '139px',
                'start': '100px',
                'end': '100px'
            };

            Object.keys(defaultWidths).forEach(colName => {
                const cols = document.querySelectorAll(`.wbs-col-${colName}`);
                cols.forEach(col => {
                    col.style.width = defaultWidths[colName];
                    col.style.minWidth = defaultWidths[colName];
                    col.style.maxWidth = defaultWidths[colName];
                    col.style.flexShrink = '0';
                    col.style.flexGrow = '0';
                });
            });

            // Reset panel width to initial position
            const wbsPanel = document.querySelector('.wbs-list-panel');
            if (wbsPanel) {
                wbsPanel.style.setProperty('width', '852px', 'important');
                wbsPanel.style.setProperty('max-width', '852px', 'important');
                wbsPanel.style.setProperty('flex-basis', '852px', 'important');
            }

            Utils.showNotification('カラム幅をリセットしました', 'success');

            // Log reset widths
            setTimeout(() => {
                this.logColumnWidths();
            }, 100);
        });
    },

    /**
     * Setup panel resize functionality
     */
    setupPanelResize() {
        const resizeHandle = document.getElementById('panel-resize-handle');
        const wbsPanel = document.querySelector('.wbs-list-panel');

        if (!resizeHandle || !wbsPanel) {
            // console.log('Panel resize elements not found');
            return;
        }

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.pageX;
            startWidth = wbsPanel.offsetWidth;

            resizeHandle.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const diff = e.pageX - startX;
            const newWidth = startWidth + diff;

            // Apply min and max constraints
            const containerWidth = wbsPanel.parentElement.offsetWidth;
            const minWidth = 500;
            const maxWidth = containerWidth - 250; // Leave at least 250px for gantt chart
            const finalWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

            // Set both width and flex-basis to override CSS flex settings (including media queries)
            wbsPanel.style.setProperty('width', `${finalWidth}px`, 'important');
            wbsPanel.style.setProperty('max-width', `${finalWidth}px`, 'important');
            wbsPanel.style.setProperty('flex-basis', `${finalWidth}px`, 'important');
            wbsPanel.style.setProperty('flex-grow', '0', 'important');
            wbsPanel.style.setProperty('flex-shrink', '0', 'important');
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizeHandle.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    },

    /**
     * Log current column widths for debugging
     */
    logColumnWidths() {
        // const columns = [
        //     'name',
        //     'type',
        //     'points',
        //     'assignee',
        //     'start',
        //     'end',
        //     'progress'
        // ];

        // console.log('[DEBUG-RESIZE]\n========== Column Widths ==========');

        // const wbsPanel = document.querySelector('.wbs-list-panel');
        // if (wbsPanel) {
        //     console.log(`[DEBUG-RESIZE] WBS Panel Width: ${wbsPanel.offsetWidth}px`);
        // }

        // let totalWidth = 0;
        // columns.forEach(colName => {
        //     const col = document.querySelector(`.wbs-col-${colName}`);
        //     if (col) {
        //         const width = col.offsetWidth;
        //         totalWidth += width;
        //         console.log(`[DEBUG-RESIZE]   ${colName.padEnd(10)}: ${width}px`);
        //     }
        // });

        // console.log(`[DEBUG-RESIZE] Total Column Width: ${totalWidth}px`);
        // console.log('[DEBUG-RESIZE] ===================================\n');
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
        document.getElementById('delete-project-btn')?.addEventListener('click', () => this.deleteCurrentProject());
        document.getElementById('export-btn')?.addEventListener('click', () => ImportExport.showExportDialog());
        document.getElementById('import-btn')?.addEventListener('click', () => ImportExport.showImportDialog());

        // Jump to today button
        document.getElementById('jump-to-today-btn')?.addEventListener('click', () => {
            GanttRenderer.scrollToToday();
        });

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

            // Progress auto-update status
            const progressInput = document.getElementById('task-progress');
            const statusSelect = document.getElementById('task-status');
            if (progressInput && statusSelect) {
                // When progress changes, auto-update status
                progressInput.addEventListener('input', (e) => {
                    const progress = parseInt(e.target.value) || 0;
                    const currentStatus = statusSelect.value;

                    // Auto-update status based on progress
                    if (progress > 0 && progress < 100 && currentStatus === 'todo') {
                        statusSelect.value = 'in_progress';
                    } else if (progress === 100 && currentStatus !== 'done') {
                        statusSelect.value = 'done';
                    }
                });

                // When status changes, suggest appropriate progress
                statusSelect.addEventListener('change', (e) => {
                    const status = e.target.value;
                    const currentProgress = parseInt(progressInput.value) || 0;

                    // Auto-suggest progress based on status
                    if (status === 'review' && currentProgress < 90) {
                        progressInput.value = 90;
                    } else if (status === 'done' && currentProgress < 100) {
                        progressInput.value = 100;
                    } else if (status === 'in_progress' && currentProgress === 0) {
                        progressInput.value = 10;
                    }
                });
            }

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

            document.getElementById('sprint-delete-btn')?.addEventListener('click', () => {
                this.deleteSprint();
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

        // Show/hide jump to today button (only for gantt view)
        const jumpBtn = document.getElementById('jump-to-today-btn');
        if (jumpBtn) {
            jumpBtn.style.display = view === 'gantt' ? 'inline-block' : 'none';
        }

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

        const tasks = WBSManager.getVisibleTasks();

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
            html += this.renderTaskRow(task);
        });

        container.innerHTML = html;

        // Add event listeners
        this.attachTaskRowListeners();

        // Re-apply panel width after rendering (in case it was reset)
        const wbsPanel = document.querySelector('.wbs-list-panel');
        if (wbsPanel) {
            const currentWidth = wbsPanel.offsetWidth;
            // console.log(`[DEBUG-RESIZE] WBS Panel width after rendering: ${currentWidth}px`);
            if (currentWidth < 852) {
                wbsPanel.style.setProperty('width', '852px', 'important');
                wbsPanel.style.setProperty('max-width', '852px', 'important');
                wbsPanel.style.setProperty('flex-basis', '852px', 'important');
                // console.log(`[DEBUG-RESIZE] WBS Panel width corrected to: ${wbsPanel.offsetWidth}px`);
            }
        }

        // Re-apply column widths after rendering
        const defaultWidths = {
            'name': '315px',
            'type': '64px',
            'points': '65px',
            'assignee': '139px',
            'start': '100px',
            'end': '100px'
        };

        Object.keys(defaultWidths).forEach(colName => {
            const cols = document.querySelectorAll(`.wbs-col-${colName}`);
            cols.forEach(col => {
                col.style.width = defaultWidths[colName];
                col.style.minWidth = defaultWidths[colName];
                col.style.maxWidth = defaultWidths[colName];
                col.style.flexShrink = '0';
                col.style.flexGrow = '0';
            });
        });
    },

    /**
     * Render task row
     */
    renderTaskRow(task) {
        const indent = task.level * 20;
        const hasChildren = WBSManager.getTasks().some(t => t.parentId === task.id);
        const isCollapsed = WBSManager.isTaskCollapsed(task.id);
        const parentClass = hasChildren ? ' parent-task' : '';

        let html = `<div class="wbs-row${parentClass}" data-task-id="${task.id}">`;

        // Task name with hierarchy
        html += `<div class="wbs-col wbs-col-name">`;

        // Indent
        if (indent > 0) {
            html += `<span class="task-indent" style="width: ${indent}px"></span>`;
        }

        // Toggle button for parents
        if (hasChildren) {
            const toggleIcon = isCollapsed ? '▶' : '▼';
            html += `<span class="task-toggle" data-task-id="${task.id}" style="cursor: pointer; margin-right: 4px;">${toggleIcon}</span>`;
        } else {
            html += `<span style="width: 16px; display: inline-block;"></span>`;
        }

        // Task icon
        const icon = this.getTaskIcon(task.type);
        html += `<span class="task-type-icon">${icon}</span>`;

        // Task name
        html += `<span class="task-name" style="flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;" title="${Utils.escapeHTML(task.name)}">${Utils.escapeHTML(task.name)}</span>`;
        html += `</div>`;

        // Type
        html += `<div class="wbs-col wbs-col-type">${this.getTaskTypeLabel(task.type)}</div>`;

        // Story points
        html += `<div class="wbs-col wbs-col-points">${task.storyPoints || '-'}</div>`;

        // Assignee
        html += `<div class="wbs-col wbs-col-assignee" title="${Utils.escapeHTML(task.assignee || '')}">${Utils.escapeHTML(task.assignee || '-')}</div>`;

        // Start date
        html += `<div class="wbs-col wbs-col-start">${task.startDate ? Utils.formatDate(task.startDate) : '-'}</div>`;

        // End date
        html += `<div class="wbs-col wbs-col-end">${task.endDate ? Utils.formatDate(task.endDate) : '-'}</div>`;

        // Progress
        html += `<div class="wbs-col wbs-col-progress">${task.progress}%</div>`;

        html += `</div>`;

        return html;
    },

    /**
     * Select a task row
     */
    selectTaskRow(taskId) {
        // Remove previous selection
        document.querySelectorAll('.wbs-row.selected').forEach(row => {
            row.classList.remove('selected');
        });

        // Add selection to clicked row
        const row = document.querySelector(`.wbs-row[data-task-id="${taskId}"]`);
        if (row) {
            row.classList.add('selected');
        }

        // Store selected task ID
        this.selectedTaskId = taskId;

        // Re-render gantt chart to highlight selected task
        this.renderGanttChart();
    },

    /**
     * Attach event listeners to task rows
     */
    attachTaskRowListeners() {
        // Single click to select row
        document.querySelectorAll('.wbs-row').forEach(row => {
            row.addEventListener('click', (e) => {
                // Don't select if clicking on toggle button
                if (e.target.classList.contains('task-toggle')) return;

                const taskId = e.currentTarget.dataset.taskId;
                this.selectTaskRow(taskId);
            });
        });

        // Double click to edit
        document.querySelectorAll('.wbs-row').forEach(row => {
            row.addEventListener('dblclick', (e) => {
                const taskId = e.currentTarget.dataset.taskId;
                this.showEditTaskModal(taskId);
            });
        });

        // Toggle collapse
        document.querySelectorAll('.task-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = e.target.dataset.taskId;
                WBSManager.toggleTaskCollapse(taskId);
                this.renderWBSList();
                this.renderGanttChart();
            });
        });

        // Drag and drop for task hierarchy
        document.querySelectorAll('.wbs-row').forEach(row => {
            row.setAttribute('draggable', 'true');

            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', e.currentTarget.dataset.taskId);
                e.currentTarget.style.opacity = '0.5';
            });

            row.addEventListener('dragend', (e) => {
                e.currentTarget.style.opacity = '1';
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                e.currentTarget.classList.add('drag-over');
            });

            row.addEventListener('dragleave', (e) => {
                e.currentTarget.classList.remove('drag-over');
            });

            row.addEventListener('drop', (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over');

                const draggedTaskId = e.dataTransfer.getData('text/plain');
                const targetTaskId = e.currentTarget.dataset.taskId;

                if (draggedTaskId === targetTaskId) return;

                // Move task under target as child
                this.moveTaskToParent(draggedTaskId, targetTaskId);
            });
        });
    },

    /**
     * Move task to new parent
     */
    moveTaskToParent(taskId, newParentId) {
        const task = WBSManager.getTask(taskId);
        const newParent = WBSManager.getTask(newParentId);

        if (!task || !newParent) return;

        // Prevent circular reference
        if (this.wouldCreateCircularReference(taskId, newParentId)) {
            Utils.showNotification('親タスクを自分の子タスクには移動できません', 'error');
            return;
        }

        // Update parent
        WBSManager.updateTask(taskId, { parentId: newParentId });

        Utils.showNotification(`「${task.name}」を「${newParent.name}」の子タスクに移動しました`, 'success');
        this.refresh();
    },

    /**
     * Check if move would create circular reference
     */
    wouldCreateCircularReference(taskId, newParentId) {
        let currentId = newParentId;
        while (currentId) {
            if (currentId === taskId) return true;
            const parent = WBSManager.getTask(currentId);
            currentId = parent ? parent.parentId : null;
        }
        return false;
    },

    /**
     * Render Gantt chart
     */
    renderGanttChart() {
        // Use same visible tasks as WBS list for consistency
        const tasks = WBSManager.getVisibleTasks();
        GanttRenderer.render(tasks);
        GanttRenderer.renderTimelineHeader();
        this.setupGanttScrollSync();
    },

    /**
     * Setup scroll synchronization between header and canvas
     */
    setupGanttScrollSync() {
        const header = document.getElementById('gantt-header');
        const container = document.getElementById('gantt-canvas-container');
        const wbsList = document.getElementById('wbs-list');

        if (!header || !container || !wbsList) return;

        // Sync horizontal scroll between header and canvas
        container.addEventListener('scroll', () => {
            header.scrollLeft = container.scrollLeft;
        });

        // Sync vertical scroll between WBS list and canvas
        wbsList.addEventListener('scroll', () => {
            container.scrollTop = wbsList.scrollTop;
        });

        container.addEventListener('scroll', () => {
            wbsList.scrollTop = container.scrollTop;
        });
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
     * Render Backlog view
     */
    renderBacklogView() {
        if (typeof BacklogManager !== 'undefined') {
            BacklogManager.render();
        } else {
            console.error('BacklogManager module not loaded');
        }
    },

    /**
     * Render Dashboard view (placeholder for MVP)
     */
    renderDashboardView() {
        const container = document.getElementById('dashboard-view');
        if (container && typeof ChartsRenderer !== 'undefined') {
            ChartsRenderer.renderAll();
        }
    },

    /**
     * Render Report view (placeholder for MVP)
     */
    renderReportView() {
        ReportGenerator.render();
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
        document.getElementById('task-milestone').checked = false;

        this.updateParentTaskSelect();
        this.updateSprintSelect();
        this.updateDependenciesSelect();

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

        // Calculate task hierarchy level
        let level = 0;
        let currentTask = task;
        while (currentTask.parentId) {
            level++;
            currentTask = WBSManager.getTask(currentTask.parentId);
            if (!currentTask) break;
        }

        const hasChildren = WBSManager.getTasks().some(t => t.parentId === task.id);

        // Build title based on level and children
        let title = 'タスク編集';
        if (level === 0 && hasChildren) {
            title = '親タスク編集';
        } else if (level === 1 && hasChildren) {
            title = '子タスク編集 (さらに子タスクあり)';
        } else if (level === 1) {
            title = '子タスク編集';
        } else if (level > 1) {
            title = `子タスク編集 (レベル${level + 1})`;
        }

        document.getElementById('task-modal-title').textContent = title;
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
        document.getElementById('task-milestone').checked = task.isMilestone || false;

        this.updateParentTaskSelect(task.id, task.parentId);
        this.updateSprintSelect(task.sprintId);
        this.updateDependenciesSelect(task.id, task.dependencies);

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

        const sprintId = document.getElementById('task-sprint').value || null;

        const isMilestone = document.getElementById('task-milestone').checked;

        // Get checked dependencies from checkboxes
        const dependenciesContainer = document.getElementById('task-dependencies-list');
        const dependencyCheckboxes = dependenciesContainer.querySelectorAll('input[type="checkbox"]:checked');
        const dependencies = Array.from(dependencyCheckboxes).map(cb => cb.value);

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
            parentId: parentId,
            sprintId: sprintId,
            isMilestone: isMilestone,
            dependencies: dependencies
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
     * Delete current project
     */
    deleteCurrentProject() {
        const currentId = Storage.getCurrentProjectId();
        if (!currentId) {
            Utils.showNotification('削除するプロジェクトがありません', 'error');
            return;
        }

        const project = Storage.getProject(currentId);
        if (!project) return;

        if (!confirm(`プロジェクト「${project.name}」を削除してもよろしいですか？\n\nこの操作は取り消せません。`)) {
            return;
        }

        // Delete project
        Storage.deleteProject(currentId);

        // Switch to another project or clear
        const projects = Storage.getProjects();
        if (projects.length > 0) {
            Storage.setCurrentProject(projects[0].id);
            this.loadProject(projects[0].id);
        } else {
            // No projects left
            Storage.setCurrentProject(null);
            WBSManager.init(null);
            this.refresh();
        }

        this.updateProjectSelector();
        Utils.showNotification('プロジェクトを削除しました', 'success');
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

        // Show/hide delete button based on project selection
        const deleteBtn = document.getElementById('delete-project-btn');
        if (deleteBtn) {
            deleteBtn.style.display = currentId ? 'flex' : 'none';
        }
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
            bug: '🐛',
            folder: '📁'
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
            bug: 'Bug',
            folder: 'Folder'
        };
        return labels[type] || type;
    },

    /**
     * Show new sprint modal
     */
    showNewSprintModal() {
        this.currentSprintModal = null;

        document.getElementById('sprint-modal-title')?.textContent || (document.querySelector('#sprint-modal .modal-header h2').textContent = 'スプリント作成');
        document.getElementById('sprint-name').value = '';
        document.getElementById('sprint-goal').value = '';
        document.getElementById('sprint-start-date').value = '';
        document.getElementById('sprint-end-date').value = '';
        document.getElementById('sprint-status').value = 'planned';

        document.getElementById('sprint-save-btn').textContent = '作成';
        document.getElementById('sprint-delete-btn').style.display = 'none';

        document.getElementById('sprint-modal').classList.add('active');
    },

    /**
     * Show edit sprint modal
     */
    showEditSprintModal(sprintId) {
        const sprint = WBSManager.getSprint(sprintId);
        if (!sprint) return;

        this.currentSprintModal = sprintId;

        document.querySelector('#sprint-modal .modal-header h2').textContent = 'スプリント編集';
        document.getElementById('sprint-name').value = sprint.name;
        document.getElementById('sprint-goal').value = sprint.goal || '';
        document.getElementById('sprint-start-date').value = sprint.startDate;
        document.getElementById('sprint-end-date').value = sprint.endDate;
        document.getElementById('sprint-status').value = sprint.status || 'planned';

        document.getElementById('sprint-save-btn').textContent = '更新';
        document.getElementById('sprint-delete-btn').style.display = 'block';

        document.getElementById('sprint-modal').classList.add('active');
    },

    /**
     * Hide sprint modal
     */
    hideSprintModal() {
        document.getElementById('sprint-modal').classList.remove('active');
        this.currentSprintModal = null;
    },

    /**
     * Save sprint
     */
    saveSprint() {
        const name = document.getElementById('sprint-name').value.trim();
        const goal = document.getElementById('sprint-goal').value.trim();
        const startDate = document.getElementById('sprint-start-date').value;
        const endDate = document.getElementById('sprint-end-date').value;
        const status = document.getElementById('sprint-status').value;

        if (!name || !startDate || !endDate) {
            Utils.showNotification('必須項目を入力してください', 'error');
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            Utils.showNotification('終了日は開始日より後にしてください', 'error');
            return;
        }

        if (this.currentSprintModal) {
            // Update existing sprint
            WBSManager.updateSprint(this.currentSprintModal, {
                name,
                goal,
                startDate,
                endDate,
                status
            });
            Utils.showNotification('スプリントを更新しました', 'success');
        } else {
            // Create new sprint
            WBSManager.addSprint({
                name,
                goal,
                startDate,
                endDate,
                status
            });
            Utils.showNotification('スプリントを作成しました', 'success');
        }

        this.hideSprintModal();

        // Refresh backlog view if active
        if (this.currentView === 'backlog' && typeof BacklogManager !== 'undefined') {
            BacklogManager.refresh();
        }
    },

    /**
     * Delete sprint
     */
    deleteSprint() {
        if (!this.currentSprintModal) return;

        if (!Utils.confirm('このスプリントを削除しますか？')) return;

        WBSManager.deleteSprint(this.currentSprintModal);
        Utils.showNotification('スプリントを削除しました', 'success');

        this.hideSprintModal();

        // Refresh backlog view if active
        if (this.currentView === 'backlog' && typeof BacklogManager !== 'undefined') {
            BacklogManager.refresh();
        }
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
    },

    /**
     * Update sprint select dropdown
     */
    updateSprintSelect(selectedSprintId = null) {
        const select = document.getElementById('task-sprint');
        if (!select) return;

        const sprints = WBSManager.getSprints();
        let html = '<option value="">未割り当て</option>';

        sprints.forEach(sprint => {
            const selected = sprint.id === selectedSprintId ? 'selected' : '';
            const statusLabel = sprint.status === 'active' ? '🟢 ' : sprint.status === 'completed' ? '✅ ' : '';
            html += `<option value="${sprint.id}" ${selected}>${statusLabel}${Utils.escapeHTML(sprint.name)}</option>`;
        });

        select.innerHTML = html;
    },

    /**
     * Update dependencies list with checkboxes
     */
    updateDependenciesSelect(currentTaskId = null, selectedDependencies = []) {
        const container = document.getElementById('task-dependencies-list');
        if (!container) return;

        const tasks = WBSManager.getTasks();
        let html = '';

        tasks.forEach(task => {
            // Don't include the current task (can't depend on itself)
            if (task.id === currentTaskId) return;

            const checked = selectedDependencies && selectedDependencies.includes(task.id) ? 'checked' : '';
            const typeLabel = Utils.getTaskTypeLabel(task.type);
            const statusIcon = task.status === 'done' ? '✅ ' : task.status === 'in_progress' ? '🔄 ' : '';

            html += `
                <div class="dependency-item">
                    <input type="checkbox" id="dep-${task.id}" value="${task.id}" ${checked}>
                    <label for="dep-${task.id}">${statusIcon}${Utils.escapeHTML(task.name)} (${typeLabel})</label>
                </div>
            `;
        });

        if (html === '') {
            html = '<p style="color: var(--text-secondary); font-size: 13px; padding: 8px;">他のタスクがありません</p>';
        }

        container.innerHTML = html;
    }
};
