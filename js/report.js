/**
 * Report Generator
 * Generates various types of reports (daily, weekly, monthly, sprint)
 */

const ReportGenerator = (() => {
    let currentReportType = 'daily';

    // Customization settings
    let customization = {
        showSummary: true,
        showCompletedTasks: true,
        showInProgressTasks: true,
        showDelayedTasks: true,
        showStatusBreakdown: true,
        showTypeBreakdown: true,
        showAssignee: true,
        showStoryPoints: true,
        showCharts: true
    };

    let charts = {}; // Store chart instances

    let schedule = {
        daily: false,
        weekly: false,
        monthly: false,
        lastRun: {
            daily: null,
            weekly: null,
            monthly: null
        }
    };

    /**
     * Initialize report generator
     */
    function init() {
        loadCustomization();
        loadSchedule();
        setupEventListeners();
        checkScheduledReports();
        // console.log('Report Generator initialized');
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Report type selector
        const reportTypeSelect = document.getElementById('report-type');
        if (reportTypeSelect) {
            reportTypeSelect.addEventListener('change', (e) => {
                currentReportType = e.target.value;
                generateReport();
            });
        }

        // Export buttons
        const exportPdfBtn = document.getElementById('export-pdf-btn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => exportToPDF());
        }

        const exportHtmlBtn = document.getElementById('export-html-btn');
        if (exportHtmlBtn) {
            exportHtmlBtn.addEventListener('click', () => exportToHTML());
        }

        // Customization buttons
        const customizeBtn = document.getElementById('report-customize-btn');
        const customizePanel = document.getElementById('report-customize-panel');
        if (customizeBtn && customizePanel) {
            customizeBtn.addEventListener('click', () => {
                const isVisible = customizePanel.style.display !== 'none';
                customizePanel.style.display = isVisible ? 'none' : 'block';
            });
        }

        const applyCustomizeBtn = document.getElementById('apply-customize-btn');
        if (applyCustomizeBtn) {
            applyCustomizeBtn.addEventListener('click', () => {
                saveCustomization();
                generateReport();
                Utils.showNotification('カスタマイズを適用しました', 'success');
            });
        }

        const resetCustomizeBtn = document.getElementById('reset-customize-btn');
        if (resetCustomizeBtn) {
            resetCustomizeBtn.addEventListener('click', () => {
                resetCustomization();
                Utils.showNotification('カスタマイズをリセットしました', 'success');
            });
        }

        // Schedule buttons
        const scheduleBtn = document.getElementById('report-schedule-btn');
        const schedulePanel = document.getElementById('report-schedule-panel');
        if (scheduleBtn && schedulePanel) {
            scheduleBtn.addEventListener('click', () => {
                const isVisible = schedulePanel.style.display !== 'none';
                schedulePanel.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) {
                    updateScheduleUI();
                }
            });
        }

        const saveScheduleBtn = document.getElementById('save-schedule-btn');
        if (saveScheduleBtn) {
            saveScheduleBtn.addEventListener('click', () => {
                saveSchedule();
                Utils.showNotification('スケジュール設定を保存しました', 'success');
            });
        }

        const closeScheduleBtn = document.getElementById('close-schedule-btn');
        if (closeScheduleBtn && schedulePanel) {
            closeScheduleBtn.addEventListener('click', () => {
                schedulePanel.style.display = 'none';
            });
        }
    }

    /**
     * Render report view
     */
    function render() {
        generateReport();
    }

    /**
     * Generate report based on type
     */
    function generateReport() {
        const container = document.getElementById('report-content');
        if (!container) return;

        // Destroy existing charts
        Object.values(charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        charts = {};

        let html = '';

        switch (currentReportType) {
            case 'daily':
                html = generateDailyReport();
                break;
            case 'weekly':
                html = generateWeeklyReport();
                break;
            case 'monthly':
                html = generateMonthlyReport();
                break;
            case 'sprint':
                html = generateSprintReport();
                break;
            default:
                html = '<p>レポートタイプを選択してください</p>';
        }

        container.innerHTML = html;

        // Render charts after DOM is updated
        if (customization.showCharts) {
            setTimeout(() => renderCharts(), 100);
        }
    }

    /**
     * Generate daily report
     */
    function generateDailyReport() {
        const today = new Date();
        const tasks = WBSManager.getTasks();

        // Get today's completed tasks
        const completedToday = tasks.filter(task => {
            if (!task.actualEndDate) return false;
            const endDate = new Date(task.actualEndDate);
            return endDate.toDateString() === today.toDateString();
        });

        // Get in-progress tasks
        const inProgress = tasks.filter(task => task.status === 'in_progress');

        // Get today's issues/blockers
        const delayed = tasks.filter(task => {
            if (!task.endDate || task.status === 'done') return false;
            const endDate = new Date(task.endDate);
            return endDate < today;
        });

        let html = `<div class="report-section"><h2>日次レポート - ${Utils.formatDate(today)}</h2>`;

        if (customization.showSummary) {
            html += `
                <div class="report-summary">
                    <div class="summary-card">
                        <h3>📊 本日の概要</h3>
                        <ul>
                            <li>完了タスク: ${completedToday.length}件</li>
                            <li>進行中: ${inProgress.length}件</li>
                            <li>遅延タスク: ${delayed.length}件</li>
                        </ul>
                    </div>
                </div>`;
        }

        if (customization.showCompletedTasks) {
            html += `
                <div class="report-section">
                    <h3>✅ 本日完了したタスク (${completedToday.length}件)</h3>
                    ${renderTaskList(completedToday)}
                </div>`;
        }

        if (customization.showInProgressTasks) {
            html += `
                <div class="report-section">
                    <h3>🚀 進行中のタスク (${inProgress.length}件)</h3>
                    ${renderTaskList(inProgress)}
                </div>`;
        }

        if (customization.showDelayedTasks && delayed.length > 0) {
            html += `
                <div class="report-section warning">
                    <h3>⚠️ 遅延タスク (${delayed.length}件)</h3>
                    ${renderTaskList(delayed)}
                </div>`;
        }

        // Add charts section
        if (customization.showCharts) {
            html += `
                <div class="report-section">
                    <h3>📈 進捗推移</h3>
                    <div class="chart-container">
                        <canvas id="report-progress-chart"></canvas>
                    </div>
                </div>
                <div class="report-section">
                    <h3>📊 ステータス分布</h3>
                    <div class="chart-container">
                        <canvas id="report-status-chart"></canvas>
                    </div>
                </div>`;
        }

        html += `
                <div class="report-section">
                    <h3>📝 明日の予定</h3>
                    <p>進行中のタスクを継続します。</p>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Generate weekly report
     */
    function generateWeeklyReport() {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Sunday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const tasks = WBSManager.getTasks();

        // Get this week's completed tasks
        const completedThisWeek = tasks.filter(task => {
            if (!task.actualEndDate) return false;
            const endDate = new Date(task.actualEndDate);
            return endDate >= weekStart && endDate <= weekEnd;
        });

        // Calculate velocity (story points completed)
        const velocity = completedThisWeek.reduce((sum, task) => {
            return sum + (task.storyPoints || 0);
        }, 0);

        // Get status breakdown
        const statusBreakdown = {
            todo: tasks.filter(t => t.status === 'todo').length,
            in_progress: tasks.filter(t => t.status === 'in_progress').length,
            review: tasks.filter(t => t.status === 'review').length,
            done: tasks.filter(t => t.status === 'done').length
        };

        let html = `<div class="report-section"><h2>週次レポート - ${Utils.formatDate(weekStart)} ～ ${Utils.formatDate(weekEnd)}</h2>`;

        if (customization.showSummary || customization.showStatusBreakdown) {
            html += `<div class="report-summary">`;

            if (customization.showSummary) {
                html += `
                    <div class="summary-card">
                        <h3>📊 今週の概要</h3>
                        <ul>
                            <li>完了タスク: ${completedThisWeek.length}件</li>
                            <li>ベロシティ: ${velocity} SP</li>
                            <li>完了率: ${tasks.length > 0 ? Math.round((statusBreakdown.done / tasks.length) * 100) : 0}%</li>
                        </ul>
                    </div>`;
            }

            if (customization.showStatusBreakdown) {
                html += `
                    <div class="summary-card">
                        <h3>📈 ステータス別</h3>
                        <ul>
                            <li>未着手: ${statusBreakdown.todo}件</li>
                            <li>着手中: ${statusBreakdown.in_progress}件</li>
                            <li>レビュー中: ${statusBreakdown.review}件</li>
                            <li>完了: ${statusBreakdown.done}件</li>
                        </ul>
                    </div>`;
            }

            html += `</div>`;
        }

        if (customization.showCharts) {
            html += `
                <div class="report-section">
                    <h3>📈 進捗推移</h3>
                    <div class="chart-container">
                        <canvas id="report-progress-chart"></canvas>
                    </div>
                </div>
                <div class="report-section">
                    <h3>📊 ステータス分布</h3>
                    <div class="chart-container">
                        <canvas id="report-status-chart"></canvas>
                    </div>
                </div>`;
        }

        if (customization.showCompletedTasks) {
            html += `
                <div class="report-section">
                    <h3>✅ 今週完了したタスク (${completedThisWeek.length}件)</h3>
                    ${renderTaskList(completedThisWeek)}
                </div>`;
        }

        html += `
                <div class="report-section">
                    <h3>💡 所感</h3>
                    <p>今週は${completedThisWeek.length}件のタスクを完了し、${velocity}ストーリーポイントを達成しました。</p>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Generate monthly report
     */
    function generateMonthlyReport() {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const tasks = WBSManager.getTasks();

        // Get this month's completed tasks
        const completedThisMonth = tasks.filter(task => {
            if (!task.actualEndDate) return false;
            const endDate = new Date(task.actualEndDate);
            return endDate >= monthStart && endDate <= monthEnd;
        });

        // Calculate velocity
        const velocity = completedThisMonth.reduce((sum, task) => {
            return sum + (task.storyPoints || 0);
        }, 0);

        // Get type breakdown
        const typeBreakdown = {
            epic: tasks.filter(t => t.type === 'epic').length,
            story: tasks.filter(t => t.type === 'story').length,
            task: tasks.filter(t => t.type === 'task').length,
            bug: tasks.filter(t => t.type === 'bug').length
        };

        const monthName = today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });

        let html = `<div class="report-section"><h2>月次レポート - ${monthName}</h2>`;

        if (customization.showSummary || customization.showTypeBreakdown) {
            html += `<div class="report-summary">`;

            if (customization.showSummary) {
                html += `
                    <div class="summary-card">
                        <h3>📊 今月の実績</h3>
                        <ul>
                            <li>完了タスク: ${completedThisMonth.length}件</li>
                            <li>総ストーリーポイント: ${velocity} SP</li>
                            <li>総タスク数: ${tasks.length}件</li>
                        </ul>
                    </div>`;
            }

            if (customization.showTypeBreakdown) {
                html += `
                    <div class="summary-card">
                        <h3>📋 種別内訳</h3>
                        <ul>
                            <li>エピック: ${typeBreakdown.epic}件</li>
                            <li>ストーリー: ${typeBreakdown.story}件</li>
                            <li>タスク: ${typeBreakdown.task}件</li>
                            <li>バグ: ${typeBreakdown.bug}件</li>
                        </ul>
                    </div>`;
            }

            html += `</div>`;
        }

        if (customization.showCharts) {
            html += `
                <div class="report-section">
                    <h3>📈 進捗推移</h3>
                    <div class="chart-container">
                        <canvas id="report-progress-chart"></canvas>
                    </div>
                </div>
                <div class="report-section">
                    <h3>📊 種別分布</h3>
                    <div class="chart-container">
                        <canvas id="report-type-chart"></canvas>
                    </div>
                </div>`;
        }

        if (customization.showCompletedTasks) {
            html += `
                <div class="report-section">
                    <h3>✅ 今月完了したタスク (${completedThisMonth.length}件)</h3>
                    ${renderTaskList(completedThisMonth)}
                </div>`;
        }

        html += `
                <div class="report-section">
                    <h3>📈 成果と課題</h3>
                    <h4>成果</h4>
                    <ul>
                        <li>${completedThisMonth.length}件のタスクを完了</li>
                        <li>${velocity}ストーリーポイントを達成</li>
                    </ul>
                    <h4>次月の目標</h4>
                    <ul>
                        <li>継続的な開発を進める</li>
                        <li>品質向上に取り組む</li>
                    </ul>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Generate sprint report
     */
    function generateSprintReport() {
        // Get sprints from current project
        const project = Storage.getCurrentProject();
        if (!project || !project.sprints) {
            return '<div class="report-section"><p>プロジェクトにスプリントがありません</p></div>';
        }

        const sprints = project.sprints;
        const currentSprint = sprints.find(s => s.status === 'active');

        if (!currentSprint) {
            return '<div class="report-section"><p>アクティブなスプリントがありません</p></div>';
        }

        const tasks = WBSManager.getTasks().filter(t => t.sprintId === currentSprint.id);
        const completedTasks = tasks.filter(t => t.status === 'done');

        const plannedPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
        const completedPoints = completedTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);

        let html = `<div class="report-section"><h2>スプリントレポート - ${Utils.escapeHTML(currentSprint.name)}</h2>`;

        if (customization.showSummary) {
            html += `
                <div class="report-summary">
                    <div class="summary-card">
                        <h3>📊 スプリント概要</h3>
                        <ul>
                            <li>期間: ${Utils.formatDate(new Date(currentSprint.startDate))} ～ ${Utils.formatDate(new Date(currentSprint.endDate))}</li>
                            <li>ステータス: ${currentSprint.status === 'active' ? 'アクティブ' : currentSprint.status}</li>
                            <li>ゴール: ${Utils.escapeHTML(currentSprint.goal || 'なし')}</li>
                        </ul>
                    </div>

                    <div class="summary-card">
                        <h3>📈 進捗</h3>
                        <ul>
                            <li>完了タスク: ${completedTasks.length} / ${tasks.length}件</li>
                            <li>完了ポイント: ${completedPoints} / ${plannedPoints} SP</li>
                            <li>達成率: ${plannedPoints > 0 ? Math.round((completedPoints / plannedPoints) * 100) : 0}%</li>
                        </ul>
                    </div>
                </div>`;
        }

        if (customization.showCompletedTasks) {
            html += `
                <div class="report-section">
                    <h3>✅ 完了したタスク (${completedTasks.length}件)</h3>
                    ${renderTaskList(completedTasks)}
                </div>`;
        }

        if (customization.showInProgressTasks) {
            html += `
                <div class="report-section">
                    <h3>🚀 進行中のタスク</h3>
                    ${renderTaskList(tasks.filter(t => t.status === 'in_progress'))}
                </div>`;
        }

        html += `
                <div class="report-section">
                    <h3>💡 スプリントレビュー</h3>
                    <p>${Utils.escapeHTML(currentSprint.review?.notes || 'レビューノートはまだありません')}</p>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Render task list
     */
    function renderTaskList(tasks) {
        if (tasks.length === 0) {
            return '<p class="no-data">タスクはありません</p>';
        }

        // Build table header based on customization settings
        let headerHtml = '<tr><th>タスク名</th><th>種別</th>';
        if (customization.showAssignee) {
            headerHtml += '<th>担当者</th>';
        }
        if (customization.showStoryPoints) {
            headerHtml += '<th>SP</th>';
        }
        headerHtml += '<th>ステータス</th></tr>';

        let html = `<table class="report-table"><thead>${headerHtml}</thead><tbody>`;

        tasks.forEach(task => {
            const statusLabel = {
                'todo': '未着手',
                'in_progress': '着手中',
                'review': 'レビュー中',
                'done': '完了'
            }[task.status] || task.status;

            let rowHtml = `<tr>
                    <td>${Utils.escapeHTML(task.name)}</td>
                    <td>${Utils.escapeHTML(task.type)}</td>`;

            if (customization.showAssignee) {
                rowHtml += `<td>${Utils.escapeHTML(task.assignee || '-')}</td>`;
            }
            if (customization.showStoryPoints) {
                rowHtml += `<td>${task.storyPoints || '-'}</td>`;
            }

            rowHtml += `<td><span class="status-badge status-${task.status}">${statusLabel}</span></td>
                </tr>`;

            html += rowHtml;
        });

        html += '</tbody></table>';
        return html;
    }

    /**
     * Render charts based on current report type
     */
    function renderCharts() {
        const tasks = WBSManager.getTasks();

        switch (currentReportType) {
            case 'daily':
                renderProgressTrendChart(tasks, 'daily');
                renderStatusChart(tasks);
                break;
            case 'weekly':
                renderProgressTrendChart(tasks, 'weekly');
                renderStatusChart(tasks);
                break;
            case 'monthly':
                renderProgressTrendChart(tasks, 'monthly');
                renderTypeChart(tasks);
                break;
            case 'sprint':
                renderProgressTrendChart(tasks, 'weekly');
                renderStatusChart(tasks);
                break;
            case 'project':
                renderProgressTrendChart(tasks, 'monthly');
                renderStatusChart(tasks);
                renderTypeChart(tasks);
                break;
        }
    }

    /**
     * Render progress trend chart (time series)
     */
    function renderProgressTrendChart(tasks, period) {
        const canvas = document.getElementById('report-progress-chart');
        if (!canvas) return;

        const project = Storage.getCurrentProject();
        if (!project || !project.startDate || !project.endDate) return;

        const startDate = new Date(project.startDate);
        const endDate = new Date(project.endDate);
        const today = new Date();

        // Find the latest actual end date among all tasks
        let latestCompletionDate = null;
        tasks.forEach(task => {
            if (task.actualEndDate) {
                const actualEnd = new Date(task.actualEndDate);
                if (!latestCompletionDate || actualEnd > latestCompletionDate) {
                    latestCompletionDate = actualEnd;
                }
            }
        });

        // Determine chart end date: use latest completion date if all tasks are done
        let chartEndDate;
        const allTasksCompleted = tasks.length > 0 && tasks.every(t => t.status === 'done');
        if (allTasksCompleted && latestCompletionDate) {
            // For completed projects, show up to the last completion date
            chartEndDate = latestCompletionDate > today ? today : latestCompletionDate;
        } else {
            // For ongoing projects, show up to today or end date
            chartEndDate = endDate > today ? today : endDate;
        }

        // Generate time periods based on period type
        const periods = generateTimePeriods(startDate, chartEndDate, period);

        // Calculate cumulative progress for each period
        const progressData = periods.map(periodDate => {
            return calculateProgressAtDate(tasks, periodDate);
        });

        // Calculate planned progress (linear)
        const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        const plannedProgress = periods.map(periodDate => {
            const daysPassed = Math.floor((periodDate - startDate) / (1000 * 60 * 60 * 24));
            return Math.min(100, (daysPassed / totalDays) * 100);
        });

        charts.progressChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: periods.map(date => formatPeriodLabel(date, period)),
                datasets: [
                    {
                        label: '実績進捗',
                        data: progressData,
                        borderColor: 'rgba(37, 99, 235, 1)',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: '予定進捗',
                        data: plannedProgress,
                        borderColor: 'rgba(100, 116, 139, 0.5)',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        title: {
                            display: true,
                            text: '進捗率 (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: getPeriodAxisLabel(period)
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { size: 12 },
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: true,
                        text: '進捗推移',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Generate time periods array
     */
    function generateTimePeriods(startDate, endDate, period) {
        const periods = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            periods.push(new Date(current));

            switch (period) {
                case 'daily':
                    current.setDate(current.getDate() + 1);
                    break;
                case 'weekly':
                    current.setDate(current.getDate() + 7);
                    break;
                case 'monthly':
                    current.setMonth(current.getMonth() + 1);
                    break;
            }
        }

        // Ensure the end date is included in the periods if not already
        if (periods.length > 0) {
            const lastPeriod = periods[periods.length - 1];
            if (lastPeriod < endDate) {
                periods.push(new Date(endDate));
            }
        }

        return periods;
    }

    /**
     * Calculate progress at a specific date
     */
    function calculateProgressAtDate(tasks, date) {
        if (tasks.length === 0) return 0;

        const completedTasks = tasks.filter(task => {
            if (!task.actualEndDate) return false;
            const endDate = new Date(task.actualEndDate);
            return endDate <= date;
        });

        return (completedTasks.length / tasks.length) * 100;
    }

    /**
     * Format period label
     */
    function formatPeriodLabel(date, period) {
        switch (period) {
            case 'daily':
                return `${date.getMonth() + 1}/${date.getDate()}`;
            case 'weekly':
                return `${date.getMonth() + 1}/${date.getDate()}`;
            case 'monthly':
                return `${date.getFullYear()}/${date.getMonth() + 1}`;
            default:
                return Utils.formatDate(date);
        }
    }

    /**
     * Get period axis label
     */
    function getPeriodAxisLabel(period) {
        switch (period) {
            case 'daily':
                return '日付';
            case 'weekly':
                return '週';
            case 'monthly':
                return '月';
            default:
                return '期間';
        }
    }

    /**
     * Render status breakdown chart
     */
    function renderStatusChart(tasks) {
        const canvas = document.getElementById('report-status-chart');
        if (!canvas) return;

        const statusData = {
            todo: tasks.filter(t => t.status === 'todo').length,
            in_progress: tasks.filter(t => t.status === 'in_progress').length,
            review: tasks.filter(t => t.status === 'review').length,
            done: tasks.filter(t => t.status === 'done').length
        };

        charts.statusChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['未着手', '着手中', 'レビュー中', '完了'],
                datasets: [{
                    data: [statusData.todo, statusData.in_progress, statusData.review, statusData.done],
                    backgroundColor: [
                        'rgba(108, 117, 125, 0.8)',
                        'rgba(13, 110, 253, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(25, 135, 84, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 12 },
                            padding: 15
                        }
                    },
                    title: {
                        display: true,
                        text: 'ステータス別タスク数',
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        });
    }

    /**
     * Render type breakdown chart
     */
    function renderTypeChart(tasks) {
        const canvas = document.getElementById('report-type-chart');
        if (!canvas) return;

        const typeData = {
            epic: tasks.filter(t => t.type === 'epic').length,
            story: tasks.filter(t => t.type === 'story').length,
            task: tasks.filter(t => t.type === 'task').length,
            bug: tasks.filter(t => t.type === 'bug').length
        };

        charts.typeChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['エピック', 'ストーリー', 'タスク', 'バグ'],
                datasets: [{
                    label: 'タスク数',
                    data: [typeData.epic, typeData.story, typeData.task, typeData.bug],
                    backgroundColor: [
                        'rgba(111, 66, 193, 0.8)',
                        'rgba(13, 110, 253, 0.8)',
                        'rgba(32, 201, 151, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '種別タスク数',
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        });
    }

    /**
     * Export to PDF
     */
    async function exportToPDF() {
        try {
            // Show loading notification
            Utils.showNotification('PDFを生成中...', 'info');

            const content = document.getElementById('report-content');
            if (!content) {
                throw new Error('レポートコンテンツが見つかりません');
            }

            // Create a temporary container for better PDF rendering
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.width = '1000px';
            tempContainer.style.background = 'white';
            tempContainer.style.padding = '40px';
            tempContainer.innerHTML = content.innerHTML;
            document.body.appendChild(tempContainer);

            // Apply inline styles for PDF
            const tables = tempContainer.querySelectorAll('.report-table');
            tables.forEach(table => {
                table.style.fontSize = '12px';
                table.style.width = '100%';
            });

            // Convert HTML to canvas
            const canvas = await html2canvas(tempContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Remove temporary container
            document.body.removeChild(tempContainer);

            // Get canvas dimensions
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;

            // Create PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            let position = 0;

            // Add image to PDF
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add new pages if content is longer than one page
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Generate filename
            const reportTypeLabel = {
                'daily': '日次',
                'weekly': '週次',
                'monthly': '月次',
                'sprint': 'スプリント'
            }[currentReportType] || currentReportType;

            const filename = `レポート_${reportTypeLabel}_${Utils.formatDate(new Date()).replace(/\//g, '-')}.pdf`;

            // Save PDF
            pdf.save(filename);

            Utils.showNotification('PDFをダウンロードしました', 'success');

        } catch (error) {
            console.error('PDF export failed:', error);
            Utils.showNotification('PDF出力に失敗しました', 'error');
        }
    }

    /**
     * Load customization settings from localStorage
     */
    function loadCustomization() {
        try {
            const saved = localStorage.getItem('report-customization');
            if (saved) {
                const savedSettings = JSON.parse(saved);
                Object.assign(customization, savedSettings);
            }
            // Update UI checkboxes
            updateCustomizationUI();
        } catch (error) {
            console.error('Failed to load customization:', error);
        }
    }

    /**
     * Save customization settings to localStorage
     */
    function saveCustomization() {
        // Read values from UI
        customization.showSummary = document.getElementById('show-summary')?.checked ?? true;
        customization.showCompletedTasks = document.getElementById('show-completed-tasks')?.checked ?? true;
        customization.showInProgressTasks = document.getElementById('show-in-progress-tasks')?.checked ?? true;
        customization.showDelayedTasks = document.getElementById('show-delayed-tasks')?.checked ?? true;
        customization.showStatusBreakdown = document.getElementById('show-status-breakdown')?.checked ?? true;
        customization.showTypeBreakdown = document.getElementById('show-type-breakdown')?.checked ?? true;
        customization.showAssignee = document.getElementById('show-assignee')?.checked ?? true;
        customization.showStoryPoints = document.getElementById('show-story-points')?.checked ?? true;
        customization.showCharts = document.getElementById('show-charts')?.checked ?? true;

        // Save to localStorage
        try {
            localStorage.setItem('report-customization', JSON.stringify(customization));
        } catch (error) {
            console.error('Failed to save customization:', error);
        }
    }

    /**
     * Reset customization to defaults
     */
    function resetCustomization() {
        customization = {
            showSummary: true,
            showCompletedTasks: true,
            showInProgressTasks: true,
            showDelayedTasks: true,
            showStatusBreakdown: true,
            showTypeBreakdown: true,
            showAssignee: true,
            showStoryPoints: true,
            showCharts: true
        };
        localStorage.removeItem('report-customization');
        updateCustomizationUI();
        generateReport();
    }

    /**
     * Update UI checkboxes based on current customization settings
     */
    function updateCustomizationUI() {
        const elements = {
            'show-summary': customization.showSummary,
            'show-completed-tasks': customization.showCompletedTasks,
            'show-in-progress-tasks': customization.showInProgressTasks,
            'show-delayed-tasks': customization.showDelayedTasks,
            'show-status-breakdown': customization.showStatusBreakdown,
            'show-type-breakdown': customization.showTypeBreakdown,
            'show-assignee': customization.showAssignee,
            'show-story-points': customization.showStoryPoints,
            'show-charts': customization.showCharts
        };

        Object.entries(elements).forEach(([id, value]) => {
            const elem = document.getElementById(id);
            if (elem) elem.checked = value;
        });
    }

    /**
     * Load schedule settings from localStorage
     */
    function loadSchedule() {
        try {
            const saved = localStorage.getItem('report-schedule');
            if (saved) {
                const savedSchedule = JSON.parse(saved);
                Object.assign(schedule, savedSchedule);
            }
        } catch (error) {
            console.error('Failed to load schedule:', error);
        }
    }

    /**
     * Save schedule settings to localStorage
     */
    function saveSchedule() {
        schedule.daily = document.getElementById('schedule-daily')?.checked ?? false;
        schedule.weekly = document.getElementById('schedule-weekly')?.checked ?? false;
        schedule.monthly = document.getElementById('schedule-monthly')?.checked ?? false;

        try {
            localStorage.setItem('report-schedule', JSON.stringify(schedule));
        } catch (error) {
            console.error('Failed to save schedule:', error);
        }
    }

    /**
     * Update schedule UI based on current settings
     */
    function updateScheduleUI() {
        const dailyCheckbox = document.getElementById('schedule-daily');
        const weeklyCheckbox = document.getElementById('schedule-weekly');
        const monthlyCheckbox = document.getElementById('schedule-monthly');

        if (dailyCheckbox) dailyCheckbox.checked = schedule.daily;
        if (weeklyCheckbox) weeklyCheckbox.checked = schedule.weekly;
        if (monthlyCheckbox) monthlyCheckbox.checked = schedule.monthly;
    }

    /**
     * Check if scheduled reports need to be generated
     */
    function checkScheduledReports() {
        const now = new Date();
        const today = now.toDateString();
        const hour = now.getHours();

        // Check if it's 9 AM
        if (hour !== 9) return;

        // Daily report
        if (schedule.daily && schedule.lastRun.daily !== today) {
            generateScheduledReport('daily');
            schedule.lastRun.daily = today;
            localStorage.setItem('report-schedule', JSON.stringify(schedule));
        }

        // Weekly report (Monday)
        if (schedule.weekly && now.getDay() === 1 && schedule.lastRun.weekly !== today) {
            generateScheduledReport('weekly');
            schedule.lastRun.weekly = today;
            localStorage.setItem('report-schedule', JSON.stringify(schedule));
        }

        // Monthly report (1st day of month)
        if (schedule.monthly && now.getDate() === 1 && schedule.lastRun.monthly !== today) {
            generateScheduledReport('monthly');
            schedule.lastRun.monthly = today;
            localStorage.setItem('report-schedule', JSON.stringify(schedule));
        }
    }

    /**
     * Generate scheduled report and auto-download
     */
    async function generateScheduledReport(type) {
        const originalType = currentReportType;
        currentReportType = type;

        try {
            await exportToPDF();
            Utils.showNotification(`スケジュール済み${type}レポートを生成しました`, 'success');
        } catch (error) {
            console.error('Scheduled report generation failed:', error);
        } finally {
            currentReportType = originalType;
        }
    }

    /**
     * Export to HTML
     */
    function exportToHTML() {
        const content = document.getElementById('report-content').innerHTML;
        const fullHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>レポート - ${currentReportType}</title>
    <style>
        body { font-family: sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
        h2, h3, h4 { color: #333; }
        .report-summary { display: flex; gap: 20px; margin: 20px 0; }
        .summary-card { flex: 1; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .report-section { margin: 30px 0; }
        .report-section.warning { background: #fff3cd; padding: 15px; border-radius: 8px; }
        .report-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .report-table th, .report-table td { padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .report-table th { background: #f8f9fa; font-weight: 600; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .status-todo { background: #e9ecef; color: #495057; }
        .status-in_progress { background: #cfe2ff; color: #084298; }
        .status-review { background: #fff3cd; color: #997404; }
        .status-done { background: #d1e7dd; color: #0f5132; }
        .no-data { color: #6c757d; font-style: italic; }
    </style>
</head>
<body>
    ${content}
</body>
</html>
        `;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${currentReportType}-${Utils.formatDate(new Date())}.html`;
        a.click();
        URL.revokeObjectURL(url);

        Utils.showNotification('HTMLファイルをダウンロードしました', 'success');
    }

    return {
        init,
        render
    };
})();
