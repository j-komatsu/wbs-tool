/**
 * Data Model
 * Defines data structures and factory functions
 */

const DataModel = {
    /**
     * Create new project
     */
    createProject(name = '新規プロジェクト') {
        return {
            id: Utils.generateUUID(),
            name: name,
            description: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectType: 'agile', // waterfall | agile | hybrid
            settings: {
                timeScale: 'day', // day | week | month
                showWeekends: true,
                workingDaysPerWeek: 5,
                inazumaLine: {
                    enabled: false,
                    baselineDate: Utils.formatDate(new Date())
                },
                columns: [
                    { id: 'name', visible: true, width: 200 },
                    { id: 'type', visible: true, width: 80 },
                    { id: 'points', visible: true, width: 50 },
                    { id: 'assignee', visible: true, width: 100 },
                    { id: 'start', visible: true, width: 100 },
                    { id: 'end', visible: true, width: 100 },
                    { id: 'progress', visible: true, width: 60 }
                ],
                sprint: {
                    defaultDuration: 14, // days
                    startDayOfWeek: 1, // Monday
                    dailyScrumTime: '10:00'
                }
            },
            sprints: [],
            tasks: [],
            members: [],
            burndown: []
        };
    },

    /**
     * Create new task
     */
    createTask(name = '新規タスク', parentId = null) {
        return {
            id: Utils.generateUUID(),
            name: name,
            type: 'task', // epic | story | task | bug
            parentId: parentId,
            order: 0,
            status: 'todo', // todo | in_progress | review | done
            priority: 'medium', // high | medium | low
            startDate: null,
            endDate: null,
            actualStartDate: null,
            actualEndDate: null,
            duration: 1,
            progress: 0, // 0-100
            storyPoints: null,
            assignee: null,
            description: '',
            acceptanceCriteria: '',
            isMilestone: false,
            sprintId: null,
            dependencies: [],
            color: null,
            tags: [],
            history: []
        };
    },

    /**
     * Create new sprint
     */
    createSprint(name, startDate, endDate) {
        return {
            id: Utils.generateUUID(),
            name: name,
            goal: '',
            startDate: startDate,
            endDate: endDate,
            status: 'planned', // planned | active | completed | archived
            plannedPoints: 0,
            completedPoints: 0,
            review: {
                notes: '',
                demo: ''
            },
            retrospective: {
                keep: [],
                problem: [],
                try: [],
                actionItems: []
            }
        };
    },

    /**
     * Create new member
     */
    createMember(name) {
        return {
            id: Utils.generateUUID(),
            name: name,
            role: null,
            avatar: null
        };
    },

    /**
     * Create history entry
     */
    createHistoryEntry(field, oldValue, newValue, user = 'User') {
        return {
            date: new Date().toISOString(),
            field: field,
            oldValue: oldValue,
            newValue: newValue,
            user: user
        };
    },

    /**
     * Clone task
     */
    cloneTask(task) {
        const cloned = Utils.deepClone(task);
        cloned.id = Utils.generateUUID();
        cloned.name = task.name + ' (コピー)';
        cloned.status = 'todo';
        cloned.progress = 0;
        cloned.actualStartDate = null;
        cloned.actualEndDate = null;
        cloned.history = [];
        return cloned;
    },

    /**
     * Validate project data
     */
    validateProject(project) {
        const errors = [];

        if (!project.id) errors.push('Project ID is required');
        if (!project.name) errors.push('Project name is required');
        if (!Array.isArray(project.tasks)) errors.push('Tasks must be an array');
        if (!Array.isArray(project.sprints)) errors.push('Sprints must be an array');

        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * Validate task data
     */
    validateTask(task) {
        const errors = [];

        if (!task.id) errors.push('Task ID is required');
        if (!task.name || task.name.trim() === '') errors.push('Task name is required');
        if (!['epic', 'story', 'task', 'bug'].includes(task.type)) {
            errors.push('Invalid task type');
        }
        if (!['todo', 'in_progress', 'review', 'done'].includes(task.status)) {
            errors.push('Invalid task status');
        }
        if (task.progress < 0 || task.progress > 100) {
            errors.push('Progress must be between 0 and 100');
        }

        // Date validation
        if (task.startDate && task.endDate) {
            const start = new Date(task.startDate);
            const end = new Date(task.endDate);
            if (start > end) {
                errors.push('Start date must be before end date');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * Calculate task duration in days
     */
    calculateDuration(startDate, endDate) {
        if (!startDate || !endDate) return 1;
        return Utils.daysDiff(startDate, endDate) + 1;
    },

    /**
     * Get task hierarchy (with children)
     */
    getTaskHierarchy(tasks, parentId = null, level = 0) {
        const result = [];
        const children = tasks.filter(t => t.parentId === parentId);

        children.forEach(task => {
            result.push({
                ...task,
                level: level,
                hasChildren: tasks.some(t => t.parentId === task.id)
            });

            // Recursively get children
            const childTasks = this.getTaskHierarchy(tasks, task.id, level + 1);
            result.push(...childTasks);
        });

        return result;
    },

    /**
     * Get all descendant task IDs
     */
    getDescendantIds(tasks, taskId) {
        const descendants = [];
        const children = tasks.filter(t => t.parentId === taskId);

        children.forEach(child => {
            descendants.push(child.id);
            descendants.push(...this.getDescendantIds(tasks, child.id));
        });

        return descendants;
    },

    /**
     * Check if task can be deleted (has no children with data)
     */
    canDeleteTask(tasks, taskId) {
        const children = tasks.filter(t => t.parentId === taskId);
        return children.length === 0;
    },

    /**
     * Calculate project progress
     */
    calculateProjectProgress(tasks) {
        if (tasks.length === 0) return 0;

        const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
        return Math.round(totalProgress / tasks.length);
    },

    /**
     * Get tasks by status
     */
    getTasksByStatus(tasks, status) {
        return tasks.filter(t => t.status === status);
    },

    /**
     * Get tasks by sprint
     */
    getTasksBySprint(tasks, sprintId) {
        if (sprintId) {
            return tasks.filter(t => t.sprintId === sprintId);
        } else {
            return tasks.filter(t => !t.sprintId);
        }
    },

    /**
     * Calculate sprint velocity
     */
    calculateSprintVelocity(tasks, sprintId) {
        const sprintTasks = this.getTasksBySprint(tasks, sprintId);
        const completedTasks = sprintTasks.filter(t => t.status === 'done');

        return completedTasks.reduce((sum, task) => {
            return sum + (task.storyPoints || 0);
        }, 0);
    },

    /**
     * Get overdue tasks
     */
    getOverdueTasks(tasks) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return tasks.filter(task => {
            if (!task.endDate || task.status === 'done') return false;

            const endDate = new Date(task.endDate);
            endDate.setHours(0, 0, 0, 0);

            return endDate < today;
        });
    },

    /**
     * Get tasks starting soon (within next 7 days)
     */
    getUpcomingTasks(tasks, days = 7) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const future = new Date(today);
        future.setDate(future.getDate() + days);

        return tasks.filter(task => {
            if (!task.startDate || task.status === 'done') return false;

            const startDate = new Date(task.startDate);
            startDate.setHours(0, 0, 0, 0);

            return startDate >= today && startDate <= future;
        });
    },

    /**
     * Group tasks by assignee
     */
    groupByAssignee(tasks) {
        return Utils.groupBy(tasks, 'assignee');
    },

    /**
     * Group tasks by type
     */
    groupByType(tasks) {
        return Utils.groupBy(tasks, 'type');
    },

    /**
     * Get unique assignees
     */
    getUniqueAssignees(tasks) {
        const assignees = tasks
            .map(t => t.assignee)
            .filter(a => a !== null && a !== '');
        return [...new Set(assignees)].sort();
    },

    /**
     * Get unique tags
     */
    getUniqueTags(tasks) {
        const allTags = tasks.flatMap(t => t.tags || []);
        return [...new Set(allTags)].sort();
    },

    /**
     * Filter tasks
     */
    filterTasks(tasks, filters) {
        return tasks.filter(task => {
            // Search by name
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                if (!task.name.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }

            // Filter by status
            if (filters.status && filters.status !== '') {
                if (task.status !== filters.status) {
                    return false;
                }
            }

            // Filter by assignee
            if (filters.assignee && filters.assignee !== '') {
                if (task.assignee !== filters.assignee) {
                    return false;
                }
            }

            // Filter by sprint
            if (filters.sprintId !== undefined) {
                if (filters.sprintId === '') {
                    // Show unassigned tasks
                    if (task.sprintId !== null) {
                        return false;
                    }
                } else {
                    if (task.sprintId !== filters.sprintId) {
                        return false;
                    }
                }
            }

            // Filter by type
            if (filters.type && filters.type !== '') {
                if (task.type !== filters.type) {
                    return false;
                }
            }

            return true;
        });
    },

    /**
     * Sort tasks
     */
    sortTasks(tasks, sortBy, ascending = true) {
        return Utils.sortByProperty(tasks, sortBy, ascending);
    }
};
