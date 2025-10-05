/**
 * Backlog & Sprint Management Module
 * バックログとスプリント管理機能
 */

const BacklogManager = (() => {
    let currentSprintId = null;
    let draggedTaskId = null;

    /**
     * 初期化
     */
    function init() {
        console.log('Backlog Manager initialized');
    }

    /**
     * バックログビューのレンダリング
     */
    function render() {
        const container = document.getElementById('backlog-container');
        if (!container) {
            console.error('Backlog container not found');
            return;
        }

        const sprints = WBSManager.getSprints();
        const tasks = WBSManager.getTasks();
        const stats = calculateSprintStats(sprints, tasks);

        let html = '<div class="backlog-layout">';

        // Left panel: Sprint list
        html += '<div class="sprint-panel">';
        html += renderSprintList(sprints, stats);
        html += '</div>';

        // Right panel: Backlog tasks
        html += '<div class="backlog-panel">';
        html += renderBacklogTasks(tasks);
        html += '</div>';

        html += '</div>';

        container.innerHTML = html;
        attachEventListeners();
    }

    /**
     * スプリント一覧のレンダリング
     */
    function renderSprintList(sprints, stats) {
        let html = '<div class="sprint-list-header">';
        html += '<h3>📅 スプリント</h3>';
        html += '<button class="btn-new-sprint" onclick="BacklogManager.showNewSprintModal()">＋ 新規スプリント</button>';
        html += '</div>';

        html += '<div class="sprint-list">';

        if (sprints.length === 0) {
            html += '<div class="empty-state">スプリントがありません</div>';
        } else {
            sprints.forEach(sprint => {
                const stat = stats[sprint.id] || { total: 0, completed: 0, points: 0, completedPoints: 0 };
                const progress = stat.points > 0 ? Math.round((stat.completedPoints / stat.points) * 100) : 0;
                const isActive = sprint.status === 'active';
                const isCurrent = sprint.id === currentSprintId;

                html += `
                    <div class="sprint-card ${isActive ? 'active' : ''} ${isCurrent ? 'selected' : ''}"
                         data-sprint-id="${sprint.id}"
                         onclick="BacklogManager.selectSprint('${sprint.id}')">
                        <div class="sprint-card-header">
                            <div class="sprint-name">${Utils.escapeHTML(sprint.name)}</div>
                            <div class="sprint-status ${sprint.status}">${getSprintStatusLabel(sprint.status)}</div>
                        </div>
                        <div class="sprint-dates">
                            ${Utils.formatDateJapanese(new Date(sprint.startDate))} - ${Utils.formatDateJapanese(new Date(sprint.endDate))}
                        </div>
                        <div class="sprint-stats">
                            <div class="stat-item">
                                <span class="stat-label">タスク:</span>
                                <span class="stat-value">${stat.completed}/${stat.total}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">ポイント:</span>
                                <span class="stat-value">${stat.completedPoints}/${stat.points}</span>
                            </div>
                        </div>
                        <div class="sprint-progress">
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill" style="width: ${progress}%; background-color: ${getProgressColor(progress)}"></div>
                            </div>
                            <span class="progress-text">${progress}%</span>
                        </div>
                        <div class="sprint-actions">
                            <button class="btn-icon" onclick="BacklogManager.editSprint('${sprint.id}'); event.stopPropagation();" title="編集">✏️</button>
                            <button class="btn-icon" onclick="BacklogManager.deleteSprint('${sprint.id}'); event.stopPropagation();" title="削除">🗑️</button>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>';

        // Velocity chart
        html += '<div class="velocity-chart">';
        html += '<h4>📈 ベロシティ</h4>';
        html += renderVelocityChart(sprints, stats);
        html += '</div>';

        return html;
    }

    /**
     * バックログタスクのレンダリング
     */
    function renderBacklogTasks(allTasks) {
        const selectedSprint = currentSprintId ? WBSManager.getSprint(currentSprintId) : null;

        let html = '<div class="backlog-header">';
        if (selectedSprint) {
            html += `<h3>📋 ${Utils.escapeHTML(selectedSprint.name)}</h3>`;
        } else {
            html += '<h3>📋 全てのタスク</h3>';
        }
        html += '</div>';

        // Filter tasks by sprint
        const sprintTasks = currentSprintId
            ? allTasks.filter(t => t.sprintId === currentSprintId)
            : allTasks.filter(t => !t.sprintId);

        // Group by status
        const grouped = {
            backlog: sprintTasks.filter(t => t.status === 'backlog'),
            todo: sprintTasks.filter(t => t.status === 'todo'),
            in_progress: sprintTasks.filter(t => t.status === 'in_progress'),
            review: sprintTasks.filter(t => t.status === 'review'),
            done: sprintTasks.filter(t => t.status === 'done')
        };

        html += '<div class="backlog-tasks">';

        // Render each status group
        Object.keys(grouped).forEach(status => {
            const tasks = grouped[status];
            const label = getStatusLabel(status);
            const icon = getStatusIcon(status);

            html += `
                <div class="backlog-section">
                    <div class="backlog-section-header">
                        <span class="section-icon">${icon}</span>
                        <span class="section-label">${label}</span>
                        <span class="section-count">${tasks.length}</span>
                    </div>
                    <div class="backlog-task-list" data-status="${status}">
                        ${tasks.length > 0 ? renderBacklogTaskCards(tasks) : '<div class="empty-state-small">タスクなし</div>'}
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // Unassigned tasks (no sprint)
        if (!currentSprintId) {
            const unassigned = allTasks.filter(t => !t.sprintId);
            if (unassigned.length > 0) {
                html += '<div class="unassigned-tasks">';
                html += '<h4>📦 未割り当てタスク</h4>';
                html += '<div class="backlog-task-list unassigned">';
                html += renderBacklogTaskCards(unassigned);
                html += '</div>';
                html += '</div>';
            }
        }

        return html;
    }

    /**
     * バックログタスクカードのレンダリング
     */
    function renderBacklogTaskCards(tasks) {
        return tasks.map(task => {
            const typeColor = Utils.getTaskTypeColor(task.type);
            const priorityIcon = getPriorityIcon(task.priority);

            return `
                <div class="backlog-task-card"
                     data-task-id="${task.id}"
                     draggable="true"
                     ondblclick="BacklogManager.editTask('${task.id}')">
                    <div class="task-card-header">
                        <span class="task-type" style="background-color: ${typeColor}">${Utils.getTaskTypeLabel(task.type)}</span>
                        <span class="task-priority">${priorityIcon}</span>
                    </div>
                    <div class="task-card-title">${Utils.escapeHTML(task.name)}</div>
                    <div class="task-card-footer">
                        ${task.storyPoints ? `<span class="task-points">📊 ${task.storyPoints}pt</span>` : ''}
                        ${task.assignee ? `<span class="task-assignee">👤 ${Utils.escapeHTML(task.assignee)}</span>` : ''}
                        ${task.endDate ? `<span class="task-date">📅 ${Utils.formatDateJapanese(new Date(task.endDate))}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * ベロシティチャートのレンダリング
     */
    function renderVelocityChart(sprints, stats) {
        const completedSprints = sprints.filter(s => s.status === 'completed');

        if (completedSprints.length === 0) {
            return '<div class="empty-state-small">完了したスプリントがありません</div>';
        }

        const velocities = completedSprints.map(s => {
            const stat = stats[s.id] || { completedPoints: 0 };
            return { name: s.name, points: stat.completedPoints };
        }).slice(-5); // Last 5 sprints

        const maxPoints = Math.max(...velocities.map(v => v.points), 1);
        const avgVelocity = velocities.reduce((sum, v) => sum + v.points, 0) / velocities.length;

        let html = '<div class="velocity-bars">';
        velocities.forEach(v => {
            const height = (v.points / maxPoints) * 100;
            html += `
                <div class="velocity-bar-item">
                    <div class="velocity-bar" style="height: ${height}%" title="${v.points}pt">
                        <span class="velocity-value">${v.points}</span>
                    </div>
                    <div class="velocity-label">${Utils.escapeHTML(v.name.substring(0, 10))}</div>
                </div>
            `;
        });
        html += '</div>';

        html += `<div class="velocity-average">平均: ${avgVelocity.toFixed(1)} pt/スプリント</div>`;

        return html;
    }

    /**
     * スプリント統計を計算
     */
    function calculateSprintStats(sprints, tasks) {
        const stats = {};

        sprints.forEach(sprint => {
            const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
            const completed = sprintTasks.filter(t => t.status === 'done');

            stats[sprint.id] = {
                total: sprintTasks.length,
                completed: completed.length,
                points: sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
                completedPoints: completed.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
            };
        });

        return stats;
    }

    /**
     * スプリント選択
     */
    function selectSprint(sprintId) {
        currentSprintId = sprintId;
        render();
    }

    /**
     * 新規スプリントモーダルを表示
     */
    function showNewSprintModal() {
        if (typeof UIController !== 'undefined') {
            UIController.showNewSprintModal();
        }
    }

    /**
     * スプリント編集
     */
    function editSprint(sprintId) {
        if (typeof UIController !== 'undefined') {
            UIController.showEditSprintModal(sprintId);
        }
    }

    /**
     * スプリント削除
     */
    function deleteSprint(sprintId) {
        if (!Utils.confirm('このスプリントを削除しますか？')) return;

        WBSManager.deleteSprint(sprintId);
        if (currentSprintId === sprintId) {
            currentSprintId = null;
        }
        render();
        Utils.showNotification('スプリントを削除しました', 'success');
    }

    /**
     * タスク編集
     */
    function editTask(taskId) {
        if (typeof UIController !== 'undefined') {
            UIController.showEditTaskModal(taskId);
        }
    }

    /**
     * イベントリスナーをアタッチ
     */
    function attachEventListeners() {
        // Drag & drop for task cards
        const cards = document.querySelectorAll('.backlog-task-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', handleTaskDragStart);
            card.addEventListener('dragend', handleTaskDragEnd);
        });

        // Drop zones
        const dropZones = document.querySelectorAll('.backlog-task-list');
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('drop', handleDrop);
            zone.addEventListener('dragenter', handleDragEnter);
            zone.addEventListener('dragleave', handleDragLeave);
        });
    }

    /**
     * ドラッグ開始
     */
    function handleTaskDragStart(e) {
        draggedTaskId = e.currentTarget.dataset.taskId;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    /**
     * ドラッグ終了
     */
    function handleTaskDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.backlog-task-list').forEach(zone => {
            zone.classList.remove('drag-over');
        });
        draggedTaskId = null;
    }

    /**
     * ドラッグオーバー
     */
    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    /**
     * ドラッグ進入
     */
    function handleDragEnter(e) {
        e.currentTarget.classList.add('drag-over');
    }

    /**
     * ドラッグ離脱
     */
    function handleDragLeave(e) {
        if (e.currentTarget.contains(e.relatedTarget)) {
            return;
        }
        e.currentTarget.classList.remove('drag-over');
    }

    /**
     * ドロップ
     */
    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        e.currentTarget.classList.remove('drag-over');

        if (!draggedTaskId) return false;

        const newStatus = e.currentTarget.dataset.status;
        const task = WBSManager.getTask(draggedTaskId);

        if (task && newStatus && task.status !== newStatus) {
            WBSManager.updateTask(draggedTaskId, { status: newStatus });
            Utils.showNotification(`タスクのステータスを変更しました`, 'success');
            render();
        }

        return false;
    }

    /**
     * バックログビューを更新
     */
    function refresh() {
        render();
    }

    // Helper functions
    function getSprintStatusLabel(status) {
        const labels = {
            planned: '計画中',
            active: '進行中',
            completed: '完了'
        };
        return labels[status] || status;
    }

    function getStatusLabel(status) {
        const labels = {
            backlog: 'バックログ',
            todo: 'TODO',
            in_progress: '進行中',
            review: 'レビュー',
            done: '完了'
        };
        return labels[status] || status;
    }

    function getStatusIcon(status) {
        const icons = {
            backlog: '📋',
            todo: '📝',
            in_progress: '🚀',
            review: '👀',
            done: '✅'
        };
        return icons[status] || '📌';
    }

    function getPriorityIcon(priority) {
        const icons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };
        return icons[priority] || '⚪';
    }

    function getProgressColor(progress) {
        if (progress >= 100) return '#198754';
        if (progress >= 75) return '#20c997';
        if (progress >= 50) return '#0dcaf0';
        if (progress >= 25) return '#ffc107';
        return '#dc3545';
    }

    // Public API
    return {
        init,
        render,
        refresh,
        selectSprint,
        showNewSprintModal,
        editSprint,
        deleteSprint,
        editTask
    };
})();
