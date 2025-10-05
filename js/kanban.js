/**
 * Kanban Board Module
 * カンバンボードの表示とドラッグ&ドロップ機能を管理
 */

const KanbanBoard = (() => {
    let draggedTaskId = null;
    let draggedElement = null;
    let currentFilters = {};
    let currentSort = 'priority'; // priority, dueDate, name

    // ステータス列の定義
    const COLUMNS = [
        { id: 'backlog', label: 'バックログ', icon: '📋', color: '#6c757d' },
        { id: 'todo', label: 'TODO', icon: '📝', color: '#0d6efd' },
        { id: 'in_progress', label: '進行中', icon: '🚀', color: '#fd7e14' },
        { id: 'review', label: 'レビュー', icon: '👀', color: '#6f42c1' },
        { id: 'done', label: '完了', icon: '✅', color: '#198754' }
    ];

    /**
     * カンバンボードの初期化
     */
    function init() {
        // 初期化時はレンダリングしない（ビュー切り替え時にレンダリング）
        attachEventListeners();
    }

    /**
     * カンバンボードのレンダリング
     */
    function render(filters = {}, sort = 'priority') {
        currentFilters = filters;
        currentSort = sort;

        const container = document.getElementById('kanban-container');
        if (!container) {
            console.error('Kanban container not found');
            return;
        }

        // タスク取得とフィルタリング
        let tasks = WBSManager.getTasks();
        tasks = applyFilters(tasks, filters);
        tasks = sortTasks(tasks, sort);

        // カンバンボードHTML生成
        let html = '<div class="kanban-board">';

        COLUMNS.forEach(column => {
            const columnTasks = tasks.filter(task => task.status === column.id);
            const totalPoints = columnTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);

            html += `
                <div class="kanban-column" data-status="${column.id}">
                    <div class="kanban-column-header" style="border-left: 4px solid ${column.color}">
                        <div class="kanban-column-title">
                            <span class="kanban-column-icon">${column.icon}</span>
                            <span class="kanban-column-label">${column.label}</span>
                            <span class="kanban-column-count">${columnTasks.length}</span>
                        </div>
                        <div class="kanban-column-points">${totalPoints} pt</div>
                    </div>
                    <div class="kanban-column-content" data-status="${column.id}">
                        ${renderColumnTasks(columnTasks)}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // ドラッグ&ドロップイベントを再アタッチ
        attachDragAndDropListeners();
    }

    /**
     * 列内のタスクカードをレンダリング
     */
    function renderColumnTasks(tasks) {
        if (tasks.length === 0) {
            return '<div class="kanban-empty">タスクがありません</div>';
        }

        return tasks.map(task => renderTaskCard(task)).join('');
    }

    /**
     * タスクカードのレンダリング
     */
    function renderTaskCard(task) {
        const typeColor = Utils.getTaskTypeColor(task.type);
        const priorityIcon = getPriorityIcon(task.priority);
        const assigneeInitials = getAssigneeInitials(task.assignee);
        const daysRemaining = getDaysRemaining(task.endDate);
        const progressColor = getProgressColor(task.progress);

        return `
            <div class="kanban-card"
                 data-task-id="${task.id}"
                 draggable="true">
                <div class="kanban-card-header">
                    <span class="kanban-card-type" style="background-color: ${typeColor}">
                        ${Utils.getTaskTypeLabel(task.type)}
                    </span>
                    <span class="kanban-card-priority">${priorityIcon}</span>
                </div>

                <div class="kanban-card-title">${Utils.escapeHTML(task.name)}</div>

                ${task.description ? `<div class="kanban-card-description">${Utils.escapeHTML(task.description.substring(0, 80))}${task.description.length > 80 ? '...' : ''}</div>` : ''}

                <div class="kanban-card-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${task.progress}%; background-color: ${progressColor}"></div>
                    </div>
                    <span class="progress-text">${task.progress}%</span>
                </div>

                <div class="kanban-card-footer">
                    <div class="kanban-card-meta">
                        ${task.storyPoints ? `<span class="kanban-card-points">📊 ${task.storyPoints}pt</span>` : ''}
                        ${task.endDate ? `<span class="kanban-card-date ${daysRemaining.class}">${daysRemaining.text}</span>` : ''}
                    </div>
                    ${task.assignee ? `<div class="kanban-card-assignee">${assigneeInitials}</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * 優先度アイコンを取得
     */
    function getPriorityIcon(priority) {
        const icons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };
        return icons[priority] || '⚪';
    }

    /**
     * 担当者のイニシャルを取得
     */
    function getAssigneeInitials(assignee) {
        if (!assignee) return '';
        // 日本語名の場合は最初の2文字、英語名の場合は頭文字
        if (/^[a-zA-Z\s]+$/.test(assignee)) {
            return assignee.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        }
        return assignee.substring(0, 2);
    }

    /**
     * 残り日数を計算
     */
    function getDaysRemaining(endDate) {
        if (!endDate) return { text: '', class: '' };

        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { text: `期限切れ ${Math.abs(diffDays)}日`, class: 'overdue' };
        } else if (diffDays === 0) {
            return { text: '今日まで', class: 'today' };
        } else if (diffDays <= 3) {
            return { text: `残り${diffDays}日`, class: 'urgent' };
        } else {
            return { text: `残り${diffDays}日`, class: '' };
        }
    }

    /**
     * 進捗率に応じた色を取得
     */
    function getProgressColor(progress) {
        if (progress >= 100) return '#198754'; // 緑
        if (progress >= 75) return '#20c997';  // 青緑
        if (progress >= 50) return '#0dcaf0';  // 水色
        if (progress >= 25) return '#ffc107';  // 黄色
        return '#dc3545'; // 赤
    }

    /**
     * タスクにフィルタを適用
     */
    function applyFilters(tasks, filters) {
        let filtered = [...tasks];

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(task =>
                task.name.toLowerCase().includes(searchLower) ||
                (task.description && task.description.toLowerCase().includes(searchLower))
            );
        }

        if (filters.type && filters.type !== 'all') {
            filtered = filtered.filter(task => task.type === filters.type);
        }

        if (filters.priority && filters.priority !== 'all') {
            filtered = filtered.filter(task => task.priority === filters.priority);
        }

        if (filters.assignee && filters.assignee !== 'all') {
            filtered = filtered.filter(task => task.assignee === filters.assignee);
        }

        if (filters.sprint && filters.sprint !== 'all') {
            filtered = filtered.filter(task => task.sprintId === filters.sprint);
        }

        return filtered;
    }

    /**
     * タスクをソート
     */
    function sortTasks(tasks, sortBy) {
        const sorted = [...tasks];

        switch (sortBy) {
            case 'priority':
                const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                sorted.sort((a, b) => {
                    const orderA = priorityOrder[a.priority] ?? 4;
                    const orderB = priorityOrder[b.priority] ?? 4;
                    return orderA - orderB;
                });
                break;

            case 'dueDate':
                sorted.sort((a, b) => {
                    if (!a.endDate && !b.endDate) return 0;
                    if (!a.endDate) return 1;
                    if (!b.endDate) return -1;
                    return new Date(a.endDate) - new Date(b.endDate);
                });
                break;

            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
                break;

            case 'storyPoints':
                sorted.sort((a, b) => (b.storyPoints || 0) - (a.storyPoints || 0));
                break;

            default:
                // デフォルトは作成順（orderフィールド）
                sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        return sorted;
    }

    /**
     * ドラッグ&ドロップイベントをアタッチ
     */
    function attachDragAndDropListeners() {
        // タスクカードのドラッグイベント
        const cards = document.querySelectorAll('.kanban-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
            card.addEventListener('dblclick', handleCardDoubleClick);
        });

        // 列のドロップイベント
        const columns = document.querySelectorAll('.kanban-column-content');
        columns.forEach(column => {
            column.addEventListener('dragover', handleDragOver);
            column.addEventListener('drop', handleDrop);
            column.addEventListener('dragenter', handleDragEnter);
            column.addEventListener('dragleave', handleDragLeave);
        });
    }

    /**
     * ドラッグ開始
     */
    function handleDragStart(e) {
        draggedTaskId = e.currentTarget.dataset.taskId;
        draggedElement = e.currentTarget;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    }

    /**
     * ドラッグ終了
     */
    function handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');

        // すべての列からドラッグオーバースタイルを削除
        document.querySelectorAll('.kanban-column-content').forEach(col => {
            col.classList.remove('drag-over');
        });

        draggedTaskId = null;
        draggedElement = null;
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
        // 子要素へのdragleaveを無視
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

        if (task && task.status !== newStatus) {
            // ステータス変更
            WBSManager.updateTask(draggedTaskId, { status: newStatus });

            // 進捗率の自動更新
            if (newStatus === 'done' && task.progress < 100) {
                WBSManager.updateTask(draggedTaskId, { progress: 100 });
            } else if (newStatus === 'in_progress' && task.progress === 0) {
                WBSManager.updateTask(draggedTaskId, { progress: 10 });
            } else if (newStatus === 'todo' || newStatus === 'backlog') {
                if (task.progress > 0) {
                    WBSManager.updateTask(draggedTaskId, { progress: 0 });
                }
            }

            // 通知表示
            const column = COLUMNS.find(col => col.id === newStatus);
            Utils.showNotification(`タスク「${task.name}」を「${column.label}」に移動しました`, 'success');

            // 再描画
            render(currentFilters, currentSort);
        }

        return false;
    }

    /**
     * カードダブルクリックでタスク編集
     */
    function handleCardDoubleClick(e) {
        const taskId = e.currentTarget.dataset.taskId;
        if (taskId && typeof UIController !== 'undefined') {
            UIController.showEditTaskModal(taskId);
        }
    }

    /**
     * イベントリスナーをアタッチ
     */
    function attachEventListeners() {
        // 将来的にフィルタ/ソート機能を追加予定
        // 現在は特にグローバルなイベントリスナーは不要
    }

    /**
     * フィルタ変更ハンドラ
     */
    function handleFilterChange(e) {
        const filters = {
            search: document.getElementById('kanban-search')?.value || '',
            type: document.getElementById('kanban-filter-type')?.value || 'all',
            priority: document.getElementById('kanban-filter-priority')?.value || 'all',
            assignee: document.getElementById('kanban-filter-assignee')?.value || 'all',
            sprint: document.getElementById('kanban-filter-sprint')?.value || 'all'
        };

        render(filters, currentSort);
    }

    /**
     * ソート変更ハンドラ
     */
    function handleSortChange(e) {
        const sortBy = e.target.value;
        render(currentFilters, sortBy);
    }

    /**
     * カンバンボードを更新（外部から呼び出し用）
     */
    function refresh() {
        render(currentFilters, currentSort);
    }

    // Public API
    return {
        init,
        render,
        refresh
    };
})();
