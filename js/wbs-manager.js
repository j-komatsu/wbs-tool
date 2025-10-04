/**
 * WBS Manager
 * Manages task operations and business logic
 */

const WBSManager = {
    currentProject: null,
    tasks: [],
    filters: {
        search: '',
        status: '',
        assignee: '',
        sprintId: undefined
    },
    selectedTaskId: null,
    collapsedTasks: new Set(), // Track collapsed parent tasks

    /**
     * Initialize WBS Manager
     */
    init(project) {
        this.currentProject = project;
        this.tasks = project.tasks || [];
        this.selectedTaskId = null;
        this.collapsedTasks.clear();
        console.log('WBS Manager initialized with', this.tasks.length, 'tasks');
    },

    /**
     * Get all tasks
     */
    getTasks() {
        return this.tasks;
    },

    /**
     * Get filtered tasks
     */
    getFilteredTasks() {
        return DataModel.filterTasks(this.tasks, this.filters);
    },

    /**
     * Get task hierarchy
     */
    getTaskHierarchy() {
        const filteredTasks = this.getFilteredTasks();
        return DataModel.getTaskHierarchy(filteredTasks);
    },

    /**
     * Get task by ID
     */
    getTask(taskId) {
        return this.tasks.find(t => t.id === taskId);
    },

    /**
     * Add task
     */
    addTask(task, parentId = null) {
        // Validate task
        const validation = DataModel.validateTask(task);
        if (!validation.valid) {
            console.error('Invalid task:', validation.errors);
            Utils.showNotification('タスクの作成に失敗しました', 'error');
            return null;
        }

        // Set parent
        task.parentId = parentId;

        // Set order (last in parent group)
        const siblings = this.tasks.filter(t => t.parentId === parentId);
        task.order = siblings.length;

        // Add to tasks
        this.tasks.push(task);

        // Save
        this.save();

        Utils.showNotification('タスクを作成しました', 'success');
        return task;
    },

    /**
     * Update task
     */
    updateTask(taskId, updates) {
        const task = this.getTask(taskId);
        if (!task) {
            console.error('Task not found:', taskId);
            return false;
        }

        // Record history for significant changes
        const historyFields = ['name', 'status', 'assignee', 'progress'];
        historyFields.forEach(field => {
            if (updates[field] !== undefined && updates[field] !== task[field]) {
                if (!task.history) task.history = [];
                task.history.push(
                    DataModel.createHistoryEntry(field, task[field], updates[field])
                );
            }
        });

        // Apply updates
        Object.assign(task, updates);

        // Auto-update actual dates based on status
        if (updates.status === 'in_progress' && !task.actualStartDate) {
            task.actualStartDate = Utils.formatDate(new Date());
        }
        if (updates.status === 'done' && !task.actualEndDate) {
            task.actualEndDate = Utils.formatDate(new Date());
            task.progress = 100;
        }

        // Validate updated task
        const validation = DataModel.validateTask(task);
        if (!validation.valid) {
            console.error('Invalid task after update:', validation.errors);
            Utils.showNotification('タスクの更新に失敗しました', 'error');
            return false;
        }

        // Save
        this.save();

        return true;
    },

    /**
     * Delete task
     */
    deleteTask(taskId) {
        const task = this.getTask(taskId);
        if (!task) {
            console.error('Task not found:', taskId);
            return false;
        }

        // Check for children
        const children = this.tasks.filter(t => t.parentId === taskId);
        if (children.length > 0) {
            if (!Utils.confirm(`このタスクには${children.length}個の子タスクがあります。すべて削除しますか？`)) {
                return false;
            }

            // Delete all descendants
            const descendantIds = DataModel.getDescendantIds(this.tasks, taskId);
            descendantIds.forEach(id => {
                this.tasks = this.tasks.filter(t => t.id !== id);
            });
        }

        // Delete task
        this.tasks = this.tasks.filter(t => t.id !== taskId);

        // Clear selection if deleted task was selected
        if (this.selectedTaskId === taskId) {
            this.selectedTaskId = null;
        }

        // Save
        this.save();

        Utils.showNotification('タスクを削除しました', 'success');
        return true;
    },

    /**
     * Move task (change order or parent)
     */
    moveTask(taskId, newParentId, newOrder) {
        const task = this.getTask(taskId);
        if (!task) return false;

        // Prevent moving to its own descendant
        const descendantIds = DataModel.getDescendantIds(this.tasks, taskId);
        if (descendantIds.includes(newParentId)) {
            Utils.showNotification('タスクを自分の子タスクに移動できません', 'error');
            return false;
        }

        // Get old and new siblings
        const oldSiblings = this.tasks.filter(t => t.parentId === task.parentId);
        const newSiblings = this.tasks.filter(t => t.parentId === newParentId);

        // Remove from old position
        oldSiblings.splice(task.order, 1);

        // Update old siblings order
        oldSiblings.forEach((sibling, index) => {
            sibling.order = index;
        });

        // Update task
        task.parentId = newParentId;
        task.order = newOrder;

        // Insert into new position
        newSiblings.splice(newOrder, 0, task);

        // Update new siblings order
        newSiblings.forEach((sibling, index) => {
            sibling.order = index;
        });

        // Save
        this.save();

        return true;
    },

    /**
     * Toggle task collapse
     */
    toggleCollapse(taskId) {
        if (this.collapsedTasks.has(taskId)) {
            this.collapsedTasks.delete(taskId);
        } else {
            this.collapsedTasks.add(taskId);
        }
    },

    /**
     * Check if task is collapsed
     */
    isCollapsed(taskId) {
        return this.collapsedTasks.has(taskId);
    },

    /**
     * Indent task (increase hierarchy level)
     */
    indentTask(taskId) {
        const task = this.getTask(taskId);
        if (!task) return false;

        // Find previous sibling
        const siblings = this.tasks.filter(t => t.parentId === task.parentId);
        const currentIndex = siblings.findIndex(t => t.id === taskId);

        if (currentIndex === 0) {
            // Can't indent - no previous sibling
            return false;
        }

        const newParent = siblings[currentIndex - 1];
        this.moveTask(taskId, newParent.id, 0);

        return true;
    },

    /**
     * Outdent task (decrease hierarchy level)
     */
    outdentTask(taskId) {
        const task = this.getTask(taskId);
        if (!task || !task.parentId) return false;

        const parent = this.getTask(task.parentId);
        if (!parent) return false;

        // Move to parent's parent, right after parent
        const newParentId = parent.parentId;
        const newSiblings = this.tasks.filter(t => t.parentId === newParentId);
        const parentIndex = newSiblings.findIndex(t => t.id === parent.id);

        this.moveTask(taskId, newParentId, parentIndex + 1);

        return true;
    },

    /**
     * Duplicate task
     */
    duplicateTask(taskId) {
        const task = this.getTask(taskId);
        if (!task) return null;

        const cloned = DataModel.cloneTask(task);
        return this.addTask(cloned, task.parentId);
    },

    /**
     * Set filters
     */
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
    },

    /**
     * Clear filters
     */
    clearFilters() {
        this.filters = {
            search: '',
            status: '',
            assignee: '',
            sprintId: undefined
        };
    },

    /**
     * Select task
     */
    selectTask(taskId) {
        this.selectedTaskId = taskId;
    },

    /**
     * Get selected task
     */
    getSelectedTask() {
        return this.selectedTaskId ? this.getTask(this.selectedTaskId) : null;
    },

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedTaskId = null;
    },

    /**
     * Get statistics
     */
    getStatistics() {
        const allTasks = this.tasks;
        const todoTasks = DataModel.getTasksByStatus(allTasks, 'todo');
        const inProgressTasks = DataModel.getTasksByStatus(allTasks, 'in_progress');
        const reviewTasks = DataModel.getTasksByStatus(allTasks, 'review');
        const doneTasks = DataModel.getTasksByStatus(allTasks, 'done');
        const overdueTasks = DataModel.getOverdueTasks(allTasks);
        const upcomingTasks = DataModel.getUpcomingTasks(allTasks);

        return {
            total: allTasks.length,
            todo: todoTasks.length,
            inProgress: inProgressTasks.length,
            review: reviewTasks.length,
            done: doneTasks.length,
            overdue: overdueTasks.length,
            upcoming: upcomingTasks.length,
            progress: DataModel.calculateProjectProgress(allTasks)
        };
    },

    /**
     * Save to storage
     */
    save() {
        if (!this.currentProject) return false;

        this.currentProject.tasks = this.tasks;
        this.currentProject.updatedAt = new Date().toISOString();

        return Storage.saveProject(this.currentProject);
    },

    /**
     * Reload from storage
     */
    reload() {
        const project = Storage.getCurrentProject();
        if (project) {
            this.init(project);
            return true;
        }
        return false;
    }
};
