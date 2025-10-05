/**
 * Charts Renderer Module
 * Handles all chart rendering for dashboard
 */

const ChartsRenderer = (() => {
    /**
     * Render all charts
     */
    function renderAll() {
        const sprints = WBSManager.getSprints();
        const tasks = WBSManager.getTasks();

        renderKPIs(sprints, tasks);
        renderBurndownChart();
        renderBurnupChart();
        renderVelocityChart();
        renderStatusChart(tasks);
        renderAssigneeChart(tasks);
        renderCFDChart();
    }

    /**
     * Render KPI cards
     */
    function renderKPIs(sprints, tasks) {
        // Project Progress
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const totalTasks = tasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        document.getElementById('project-progress').textContent = `${progress}%`;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('total-tasks').textContent = totalTasks;

        // Current Velocity
        const activeSprint = sprints.find(s => s.status === 'active');
        let currentVelocity = 0;
        if (activeSprint) {
            const sprintTasks = tasks.filter(t => t.sprintId === activeSprint.id && t.status === 'done');
            currentVelocity = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        }
        document.getElementById('current-velocity').textContent = currentVelocity;

        // Average Velocity
        const completedSprints = sprints
            .filter(s => s.status === 'completed')
            .slice(-3); // Last 3 sprints

        let avgVelocity = 0;
        if (completedSprints.length > 0) {
            const totalPoints = completedSprints.reduce((sum, sprint) => {
                const sprintTasks = tasks.filter(t => t.sprintId === sprint.id && t.status === 'done');
                return sum + sprintTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
            }, 0);
            avgVelocity = Math.round(totalPoints / completedSprints.length * 10) / 10;
        }
        document.getElementById('avg-velocity').textContent = avgVelocity;

        // Delayed Tasks
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const delayedTasks = tasks.filter(t => {
            if (t.status === 'done') return false;
            if (!t.endDate) return false;
            const endDate = new Date(t.endDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate < today;
        }).length;

        document.getElementById('delayed-tasks').textContent = delayedTasks;
    }

    /**
     * Render Burndown Chart
     */
    function renderBurndownChart() {
        const canvas = document.getElementById('burndown-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const sprints = WBSManager.getSprints();
        const tasks = WBSManager.getTasks();

        // Find active sprint
        const activeSprint = sprints.find(s => s.status === 'active');

        if (!activeSprint || !activeSprint.startDate || !activeSprint.endDate) {
            drawEmptyChart(ctx, canvas, 'アクティブなスプリントがありません');
            return;
        }

        const sprintTasks = tasks.filter(t => t.sprintId === activeSprint.id);
        if (sprintTasks.length === 0) {
            drawEmptyChart(ctx, canvas, 'スプリントにタスクがありません');
            return;
        }

        // Calculate data
        const startDate = new Date(activeSprint.startDate);
        const endDate = new Date(activeSprint.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const completedPoints = sprintTasks
            .filter(t => t.status === 'done')
            .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const remainingPoints = totalPoints - completedPoints;

        // Prepare chart
        const padding = 40;
        canvas.width = canvas.offsetWidth || 400;
        canvas.height = canvas.offsetHeight || 300;

        if (canvas.width === 0 || canvas.height === 0) return;

        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate days
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.min(totalDays, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)));

        // Draw ideal line
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw actual line
        const actualY = padding + chartHeight * (1 - remainingPoints / totalPoints);
        const actualX = padding + (chartWidth * daysPassed / totalDays);

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(actualX, actualY);
        ctx.stroke();

        // Draw point
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(actualX, actualY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw axes
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${totalPoints} SP`, padding - 5, padding + 5);
        ctx.fillText('0 SP', padding - 5, padding + chartHeight + 5);

        ctx.textAlign = 'center';
        ctx.fillText('開始', padding, padding + chartHeight + 20);
        ctx.fillText('終了', padding + chartWidth, padding + chartHeight + 20);

        // Current status
        ctx.textAlign = 'left';
        ctx.fillText(`残り: ${remainingPoints} SP`, padding + 10, padding + 20);
    }

    /**
     * Render Burnup Chart
     */
    function renderBurnupChart() {
        const canvas = document.getElementById('burnup-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const sprints = WBSManager.getSprints();
        const tasks = WBSManager.getTasks();

        const activeSprint = sprints.find(s => s.status === 'active');

        if (!activeSprint || !activeSprint.startDate || !activeSprint.endDate) {
            drawEmptyChart(ctx, canvas, 'アクティブなスプリントがありません');
            return;
        }

        const sprintTasks = tasks.filter(t => t.sprintId === activeSprint.id);
        if (sprintTasks.length === 0) {
            drawEmptyChart(ctx, canvas, 'スプリントにタスクがありません');
            return;
        }

        const startDate = new Date(activeSprint.startDate);
        const endDate = new Date(activeSprint.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const completedPoints = sprintTasks
            .filter(t => t.status === 'done')
            .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

        const padding = 40;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.min(totalDays, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)));

        // Draw scope line (total)
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, padding + chartHeight * (1 - totalPoints / totalPoints));
        ctx.lineTo(padding + chartWidth, padding + chartHeight * (1 - totalPoints / totalPoints));
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw completed line
        const completedY = padding + chartHeight * (1 - completedPoints / totalPoints);
        const completedX = padding + (chartWidth * daysPassed / totalDays);

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(padding, padding + chartHeight);
        ctx.lineTo(completedX, completedY);
        ctx.stroke();

        // Draw point
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(completedX, completedY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw axes
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${totalPoints} SP`, padding - 5, padding + 5);
        ctx.fillText('0 SP', padding - 5, padding + chartHeight + 5);

        ctx.textAlign = 'center';
        ctx.fillText('開始', padding, padding + chartHeight + 20);
        ctx.fillText('終了', padding + chartWidth, padding + chartHeight + 20);

        ctx.textAlign = 'left';
        ctx.fillText(`完了: ${completedPoints} SP`, padding + 10, padding + 20);
    }

    /**
     * Render Velocity Chart
     */
    function renderVelocityChart() {
        const canvas = document.getElementById('velocity-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const sprints = WBSManager.getSprints();
        const tasks = WBSManager.getTasks();

        const completedSprints = sprints
            .filter(s => s.status === 'completed')
            .slice(-5); // Last 5 sprints

        if (completedSprints.length === 0) {
            drawEmptyChart(ctx, canvas, '完了したスプリントがありません');
            return;
        }

        const padding = 40;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate velocities
        const velocities = completedSprints.map(sprint => {
            const sprintTasks = tasks.filter(t => t.sprintId === sprint.id && t.status === 'done');
            return sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        });

        const maxVelocity = Math.max(...velocities, 1);
        const barWidth = chartWidth / completedSprints.length;

        // Draw bars
        completedSprints.forEach((sprint, i) => {
            const velocity = velocities[i];
            const barHeight = (velocity / maxVelocity) * chartHeight;
            const x = padding + i * barWidth;
            const y = padding + chartHeight - barHeight;

            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x + 5, y, barWidth - 10, barHeight);

            // Value label
            ctx.fillStyle = '#1e293b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${velocity}`, x + barWidth / 2, y - 5);

            // Sprint name
            ctx.fillStyle = '#64748b';
            ctx.font = '10px sans-serif';
            ctx.save();
            ctx.translate(x + barWidth / 2, padding + chartHeight + 15);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(sprint.name, 0, 0);
            ctx.restore();
        });

        // Draw axes
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.stroke();

        // Average line
        const avg = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        const avgY = padding + chartHeight - (avg / maxVelocity) * chartHeight;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, avgY);
        ctx.lineTo(padding + chartWidth, avgY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`平均: ${avg.toFixed(1)} SP`, padding + 10, avgY - 5);
    }

    /**
     * Render Status Chart (Pie/Donut)
     */
    function renderStatusChart(tasks) {
        const canvas = document.getElementById('status-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const statusCounts = {
            'todo': tasks.filter(t => t.status === 'todo').length,
            'in_progress': tasks.filter(t => t.status === 'in_progress').length,
            'done': tasks.filter(t => t.status === 'done').length
        };

        const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
        if (total === 0) {
            drawEmptyChart(ctx, canvas, 'タスクがありません');
            return;
        }

        const colors = {
            'todo': '#94a3b8',
            'in_progress': '#3b82f6',
            'done': '#22c55e'
        };

        const labels = {
            'todo': '未着手',
            'in_progress': '進行中',
            'done': '完了'
        };

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 40;

        let currentAngle = -Math.PI / 2;

        Object.entries(statusCounts).forEach(([status, count]) => {
            if (count === 0) return;

            const sliceAngle = (count / total) * Math.PI * 2;

            ctx.fillStyle = colors[status];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();

            // Label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${count}`, labelX, labelY);

            currentAngle += sliceAngle;
        });

        // Legend
        let legendY = 10;
        Object.entries(statusCounts).forEach(([status, count]) => {
            ctx.fillStyle = colors[status];
            ctx.fillRect(10, legendY, 15, 15);

            ctx.fillStyle = '#1e293b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${labels[status]}: ${count}`, 30, legendY + 12);

            legendY += 20;
        });
    }

    /**
     * Render Assignee Chart (Bar)
     */
    function renderAssigneeChart(tasks) {
        const canvas = document.getElementById('assignee-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const assigneeCounts = {};
        tasks.forEach(t => {
            const assignee = t.assignee || '未割り当て';
            assigneeCounts[assignee] = (assigneeCounts[assignee] || 0) + 1;
        });

        const entries = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (entries.length === 0) {
            drawEmptyChart(ctx, canvas, 'タスクがありません');
            return;
        }

        const padding = 40;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;

        const maxCount = Math.max(...entries.map(e => e[1]));
        const barHeight = chartHeight / entries.length;

        entries.forEach(([assignee, count], i) => {
            const barWidth = (count / maxCount) * chartWidth;
            const y = padding + i * barHeight;

            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(padding, y + 5, barWidth, barHeight - 10);

            // Value
            ctx.fillStyle = '#1e293b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${count}`, padding + barWidth + 5, y + barHeight / 2 + 4);

            // Assignee name
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'right';
            ctx.fillText(assignee, padding - 5, y + barHeight / 2 + 4);
        });

        // Draw axis
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.stroke();
    }

    /**
     * Render Cumulative Flow Diagram
     */
    function renderCFDChart() {
        const canvas = document.getElementById('cfd-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const tasks = WBSManager.getTasks();

        canvas.width = canvas.offsetWidth || 600;
        canvas.height = canvas.offsetHeight || 300;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (tasks.length === 0) {
            drawEmptyChart(ctx, canvas, 'タスクがありません');
            return;
        }

        // Generate data for last 30 days
        const days = 30;
        const today = new Date();
        const data = [];

        // Check if tasks have createdAt field
        const hasCreatedAt = tasks.some(t => t.createdAt);

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            let todoCount, inProgressCount, doneCount;

            if (hasCreatedAt) {
                // Use actual createdAt data
                todoCount = tasks.filter(t => {
                    if (!t.createdAt) return false;
                    const created = new Date(t.createdAt);
                    created.setHours(0, 0, 0, 0);
                    return created <= date;
                }).length;

                inProgressCount = tasks.filter(t => {
                    if (!t.createdAt) return false;
                    const created = new Date(t.createdAt);
                    created.setHours(0, 0, 0, 0);
                    return created <= date && (t.status === 'in_progress' || t.status === 'done');
                }).length;

                doneCount = tasks.filter(t => {
                    if (!t.createdAt) return false;
                    const created = new Date(t.createdAt);
                    created.setHours(0, 0, 0, 0);
                    return created <= date && t.status === 'done';
                }).length;
            } else {
                // Fallback: show current state as if all tasks were created 30 days ago
                const ratio = (days - i) / days;
                todoCount = Math.round(tasks.length * ratio);
                inProgressCount = Math.round(tasks.filter(t => t.status === 'in_progress' || t.status === 'done').length * ratio);
                doneCount = Math.round(tasks.filter(t => t.status === 'done').length * ratio);
            }

            data.push({
                date,
                todo: todoCount,
                inProgress: inProgressCount,
                done: doneCount
            });
        }

        const padding = 40;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;

        const maxValue = Math.max(...data.map(d => d.todo), 1);
        const stepX = chartWidth / (days - 1);

        // Draw areas
        const colors = {
            todo: '#94a3b8',
            inProgress: '#3b82f6',
            done: '#22c55e'
        };

        // Done area
        ctx.fillStyle = colors.done;
        ctx.beginPath();
        ctx.moveTo(padding, padding + chartHeight);
        data.forEach((d, i) => {
            const x = padding + i * stepX;
            const y = padding + chartHeight - (d.done / maxValue) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.closePath();
        ctx.fill();

        // In Progress area
        ctx.fillStyle = colors.inProgress;
        ctx.beginPath();
        data.forEach((d, i) => {
            const x = padding + i * stepX;
            const y = padding + chartHeight - (d.inProgress / maxValue) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        for (let i = days - 1; i >= 0; i--) {
            const d = data[i];
            const x = padding + i * stepX;
            const y = padding + chartHeight - (d.done / maxValue) * chartHeight;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Todo area
        ctx.fillStyle = colors.todo;
        ctx.beginPath();
        data.forEach((d, i) => {
            const x = padding + i * stepX;
            const y = padding + chartHeight - (d.todo / maxValue) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        for (let i = days - 1; i >= 0; i--) {
            const d = data[i];
            const x = padding + i * stepX;
            const y = padding + chartHeight - (d.inProgress / maxValue) * chartHeight;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Draw axes
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${days}日前`, padding, padding + chartHeight + 20);
        ctx.fillText('今日', padding + chartWidth, padding + chartHeight + 20);

        // Legend
        const legendY = padding + 10;
        const legendItems = [
            { label: '完了', color: colors.done },
            { label: '進行中', color: colors.inProgress },
            { label: '未着手', color: colors.todo }
        ];

        let legendX = padding + chartWidth - 200;
        legendItems.forEach(item => {
            ctx.fillStyle = item.color;
            ctx.fillRect(legendX, legendY, 15, 15);

            ctx.fillStyle = '#1e293b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(item.label, legendX + 20, legendY + 12);

            legendX += 70;
        });
    }

    /**
     * Draw empty chart message
     */
    function drawEmptyChart(ctx, canvas, message) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }

    return {
        renderAll,
        renderBurndownChart,
        renderBurnupChart,
        renderVelocityChart,
        renderStatusChart,
        renderAssigneeChart,
        renderCFDChart
    };
})();

/**
 * Chart Expander Module
 */
const ChartExpander = (() => {
    let currentChart = null;
    const chartTitles = {
        'burndown-chart': 'バーンダウンチャート',
        'burnup-chart': 'バーンアップチャート',
        'velocity-chart': 'ベロシティチャート',
        'status-chart': 'ステータス別タスク数',
        'assignee-chart': '担当者別タスク数',
        'cfd-chart': '累積フローダイアグラム (CFD)'
    };

    function init() {
        document.querySelectorAll('.btn-expand-chart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chartId = btn.getAttribute('data-chart');
                expand(chartId);
            });
        });

        const modal = document.getElementById('chart-expand-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && currentChart) close();
        });
    }

    function expand(chartId) {
        currentChart = chartId;
        const modal = document.getElementById('chart-expand-modal');
        const title = document.getElementById('chart-expand-title');
        const canvas = document.getElementById('chart-expand-canvas');
        if (!modal || !canvas) return;

        title.textContent = chartTitles[chartId] || 'チャート';
        modal.classList.add('active');

        setTimeout(() => {
            const modalBody = canvas.parentElement;
            canvas.width = modalBody.offsetWidth - 40;
            canvas.height = modalBody.offsetHeight - 40;
            const ctx = canvas.getContext('2d');

            // Temporarily replace canvas IDs for rendering
            const originalCanvas = document.getElementById(chartId);
            if (originalCanvas) {
                const tempId = originalCanvas.id;
                originalCanvas.id = 'temp-' + tempId;
                canvas.id = chartId;

                ChartsRenderer.renderAll();

                canvas.id = 'chart-expand-canvas';
                originalCanvas.id = tempId;
            }
        }, 100);
    }

    function close() {
        const modal = document.getElementById('chart-expand-modal');
        if (modal) modal.classList.remove('active');
        currentChart = null;
    }

    return { init, expand, close };
})();
