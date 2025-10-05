/**
 * Gantt Chart Renderer
 * Renders Gantt chart using Canvas
 */

const GanttRenderer = {
    canvas: null,
    ctx: null,
    svg: null,
    timeScale: 'day', // day | week | month
    startDate: null,
    endDate: null,
    columnWidth: 40,
    rowHeight: 40,
    headerHeight: 25, // Height for date header row
    tasks: [],

    /**
     * Initialize Gantt Renderer
     */
    init() {
        this.canvas = document.getElementById('gantt-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.svg = document.getElementById('gantt-svg');

        if (!this.canvas || !this.ctx) {
            console.error('Canvas element not found');
            return false;
        }

        console.log('Gantt Renderer initialized');
        return true;
    },

    /**
     * Render Gantt chart
     */
    render(tasks) {
        if (!this.canvas || !this.ctx) return;

        this.tasks = tasks;

        // Calculate date range
        this.calculateDateRange();

        // Calculate canvas size
        this.resizeCanvas();

        // Clear canvas
        this.clear();

        // Draw grid
        this.drawGrid();

        // Draw date headers
        this.drawDateHeaders();

        // Draw tasks
        this.drawTasks();

        // Draw dependencies (arrows)
        this.drawDependencies();

        // Draw milestones
        this.drawMilestones();

        // Draw Inazuma line (progress line)
        this.drawInazumaLine();

        // Draw today line
        this.drawTodayLine();
    },

    /**
     * Calculate date range from tasks
     */
    calculateDateRange() {
        if (this.tasks.length === 0) {
            // Default to current month
            const today = new Date();
            this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            this.endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return;
        }

        // Find earliest and latest dates
        let earliest = null;
        let latest = null;

        this.tasks.forEach(task => {
            if (task.startDate) {
                const start = new Date(task.startDate);
                if (!earliest || start < earliest) {
                    earliest = start;
                }
            }
            if (task.endDate) {
                const end = new Date(task.endDate);
                if (!latest || end > latest) {
                    latest = end;
                }
            }
        });

        // Add buffer (1 week before and after)
        if (earliest) {
            this.startDate = new Date(earliest);
            this.startDate.setDate(this.startDate.getDate() - 7);
        } else {
            this.startDate = new Date();
        }

        if (latest) {
            this.endDate = new Date(latest);
            this.endDate.setDate(this.endDate.getDate() + 7);
        } else {
            this.endDate = new Date();
            this.endDate.setDate(this.endDate.getDate() + 30);
        }
    },

    /**
     * Get number of columns (days/weeks/months)
     */
    getColumnCount() {
        if (!this.startDate || !this.endDate) return 30;

        const diffTime = Math.abs(this.endDate - this.startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (this.timeScale) {
            case 'day':
                return diffDays;
            case 'week':
                return Math.ceil(diffDays / 7);
            case 'month':
                return Math.ceil(diffDays / 30);
            default:
                return diffDays;
        }
    },

    /**
     * Resize canvas
     */
    resizeCanvas() {
        const columnCount = this.getColumnCount();
        const rowCount = this.tasks.length;

        const width = columnCount * this.columnWidth;
        const height = this.headerHeight + rowCount * this.rowHeight;

        // Set canvas size
        this.canvas.width = Math.max(width, 800);
        this.canvas.height = Math.max(height, 600);

        // Set SVG size
        if (this.svg) {
            this.svg.setAttribute('width', this.canvas.width);
            this.svg.setAttribute('height', this.canvas.height);
        }
    },

    /**
     * Clear canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.svg) {
            this.svg.innerHTML = '';
        }
    },

    /**
     * Draw grid
     */
    drawGrid() {
        const columnCount = this.getColumnCount();
        const rowCount = this.tasks.length;

        // Draw background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw header background
        this.ctx.fillStyle = '#f1f5f9';
        this.ctx.fillRect(0, 0, this.canvas.width, this.headerHeight);

        // Draw vertical lines (columns)
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= columnCount; i++) {
            const x = i * this.columnWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();

            // Highlight weekends (only in task area, not header)
            if (this.timeScale === 'day') {
                const date = this.getDateForColumn(i);
                if (Utils.isWeekend(date)) {
                    this.ctx.fillStyle = '#f8fafc';
                    this.ctx.fillRect(x, this.headerHeight, this.columnWidth, this.canvas.height - this.headerHeight);
                }
            }
        }

        // Draw header border
        this.ctx.strokeStyle = '#cbd5e1';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.headerHeight);
        this.ctx.lineTo(this.canvas.width, this.headerHeight);
        this.ctx.stroke();

        // Draw horizontal lines (rows) - start after header
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= rowCount; i++) {
            const y = this.headerHeight + i * this.rowHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    },

    /**
     * Draw date headers at top of chart
     */
    drawDateHeaders() {
        const columnCount = this.getColumnCount();

        this.ctx.save();
        this.ctx.fillStyle = '#1e293b';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        for (let i = 0; i < columnCount; i++) {
            const date = this.getDateForColumn(i);
            const x = i * this.columnWidth + this.columnWidth / 2;
            const y = this.headerHeight / 2;

            let label = '';
            if (this.timeScale === 'day') {
                // Show MM/DD format
                label = `${date.getMonth() + 1}/${date.getDate()}`;
            } else if (this.timeScale === 'week') {
                label = `W${this.getWeekNumber(date)}`;
            } else if (this.timeScale === 'month') {
                label = `${date.getFullYear()}/${date.getMonth() + 1}`;
            }

            // Highlight today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date.getTime() === today.getTime()) {
                this.ctx.fillStyle = '#2563eb';
                this.ctx.font = 'bold 11px sans-serif';
            } else {
                this.ctx.fillStyle = '#64748b';
                this.ctx.font = '11px sans-serif';
            }

            this.ctx.fillText(label, x, y);
        }

        this.ctx.restore();
    },

    /**
     * Get week number for a date
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    /**
     * Draw tasks
     */
    drawTasks() {
        this.tasks.forEach((task, index) => {
            this.drawTaskBar(task, index);
        });
    },

    /**
     * Draw task bar
     */
    drawTaskBar(task, rowIndex) {
        if (!task.startDate || !task.endDate) return;

        const startCol = this.getColumnForDate(task.startDate);
        const endCol = this.getColumnForDate(task.endDate);

        if (startCol === null || endCol === null) return;

        const x = startCol * this.columnWidth;
        const y = this.headerHeight + rowIndex * this.rowHeight + 8;
        const width = (endCol - startCol + 1) * this.columnWidth;
        const height = this.rowHeight - 16;

        // Get color based on status
        const color = this.getTaskColor(task);

        // Draw task bar background
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);

        // Draw progress
        if (task.progress > 0) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            const progressWidth = (width * task.progress) / 100;
            this.ctx.fillRect(x, y, progressWidth, height);
        }

        // Draw border
        this.ctx.strokeStyle = this.darkenColor(color, 0.2);
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);

        // Draw task name
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';

        // Clip text to bar width
        const text = task.name;
        const textX = x + 8;
        const textY = y + height / 2;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x, y, width, height);
        this.ctx.clip();
        this.ctx.fillText(text, textX, textY);
        this.ctx.restore();
    },

    /**
     * Draw today line
     */
    drawTodayLine() {
        const todayCol = this.getColumnForDate(new Date());
        if (todayCol === null) return;

        const x = todayCol * this.columnWidth;

        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(x, this.headerHeight);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    },

    /**
     * Get column index for date
     */
    getColumnForDate(date) {
        if (!this.startDate) return null;

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const start = new Date(this.startDate);
        start.setHours(0, 0, 0, 0);

        const diffTime = targetDate - start;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return null;

        switch (this.timeScale) {
            case 'day':
                return diffDays;
            case 'week':
                return Math.floor(diffDays / 7);
            case 'month':
                return Math.floor(diffDays / 30);
            default:
                return diffDays;
        }
    },

    /**
     * Get date for column index
     */
    getDateForColumn(colIndex) {
        if (!this.startDate) return null;

        const date = new Date(this.startDate);

        switch (this.timeScale) {
            case 'day':
                date.setDate(date.getDate() + colIndex);
                break;
            case 'week':
                date.setDate(date.getDate() + colIndex * 7);
                break;
            case 'month':
                date.setMonth(date.getMonth() + colIndex);
                break;
        }

        return date;
    },

    /**
     * Get task color based on status
     */
    getTaskColor(task) {
        if (task.color) return task.color;

        return Utils.getStatusColor(task.status);
    },

    /**
     * Darken color
     */
    darkenColor(color, amount) {
        // Simple darkening - convert hex to rgb and reduce values
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount));

        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    },

    /**
     * Render timeline header
     */
    renderTimelineHeader() {
        const header = document.getElementById('gantt-header');
        if (!header) return;

        const columnCount = this.getColumnCount();
        let html = '<div class="gantt-timeline">';

        for (let i = 0; i < columnCount; i++) {
            const date = this.getDateForColumn(i);
            if (!date) continue;

            const isToday = this.isToday(date);
            const isWeekend = Utils.isWeekend(date);

            let label = '';
            switch (this.timeScale) {
                case 'day':
                    label = `${date.getMonth() + 1}/${date.getDate()}`;
                    break;
                case 'week':
                    label = `Week ${Utils.getWeekNumber(date)}`;
                    break;
                case 'month':
                    label = `${date.getFullYear()}/${date.getMonth() + 1}`;
                    break;
            }

            const classes = ['gantt-timeline-cell'];
            if (isToday) classes.push('today');
            if (isWeekend) classes.push('weekend');

            html += `<div class="${classes.join(' ')}" style="min-width: ${this.columnWidth}px;">${label}</div>`;
        }

        html += '</div>';
        header.innerHTML = html;
    },

    /**
     * Check if date is today
     */
    isToday(date) {
        if (!date) return false;
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    },

    /**
     * Set time scale
     */
    setTimeScale(scale) {
        this.timeScale = scale;
    },

    /**
     * Zoom in
     */
    zoomIn() {
        if (this.timeScale === 'month') {
            this.timeScale = 'week';
        } else if (this.timeScale === 'week') {
            this.timeScale = 'day';
        }
    },

    /**
     * Zoom out
     */
    zoomOut() {
        if (this.timeScale === 'day') {
            this.timeScale = 'week';
        } else if (this.timeScale === 'week') {
            this.timeScale = 'month';
        }
    },

    /**
     * Draw task dependencies (arrows)
     */
    drawDependencies() {
        if (!this.svg) return;

        // Clear existing arrows
        this.svg.innerHTML = '';

        this.tasks.forEach((task, taskIndex) => {
            if (!task.dependencies || task.dependencies.length === 0) return;
            if (!task.startDate) return;

            task.dependencies.forEach(depId => {
                const depTask = this.tasks.find(t => t.id === depId);
                if (!depTask || !depTask.endDate) return;

                const depTaskIndex = this.tasks.indexOf(depTask);
                if (depTaskIndex === -1) return;

                // Calculate positions
                const depEndCol = this.getColumnForDate(new Date(depTask.endDate));
                const taskStartCol = this.getColumnForDate(new Date(task.startDate));

                const x1 = (depEndCol + 1) * this.columnWidth;
                const y1 = this.headerHeight + (depTaskIndex + 0.5) * this.rowHeight;
                const x2 = taskStartCol * this.columnWidth;
                const y2 = this.headerHeight + (taskIndex + 0.5) * this.rowHeight;

                // Draw arrow
                this.drawArrow(x1, y1, x2, y2);
            });
        });
    },

    /**
     * Draw an arrow between two points
     */
    drawArrow(x1, y1, x2, y2) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Simple L-shaped arrow
        const midX = (x1 + x2) / 2;
        const d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

        path.setAttribute('d', d);
        path.setAttribute('stroke', '#f59e0b');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('marker-end', 'url(#arrowhead)');

        this.svg.appendChild(path);

        // Add arrowhead marker if not exists
        if (!document.getElementById('arrowhead')) {
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', 'arrowhead');
            marker.setAttribute('markerWidth', '10');
            marker.setAttribute('markerHeight', '10');
            marker.setAttribute('refX', '9');
            marker.setAttribute('refY', '3');
            marker.setAttribute('orient', 'auto');

            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', '0 0, 10 3, 0 6');
            polygon.setAttribute('fill', '#f59e0b');

            marker.appendChild(polygon);
            defs.appendChild(marker);
            this.svg.appendChild(defs);
        }
    },

    /**
     * Draw milestones
     */
    drawMilestones() {
        this.tasks.forEach((task, index) => {
            if (!task.isMilestone || !task.endDate) return;

            const col = this.getColumnForDate(new Date(task.endDate));
            const x = col * this.columnWidth + this.columnWidth / 2;
            const y = this.headerHeight + index * this.rowHeight + this.rowHeight / 2;
            const size = 12;

            // Draw diamond
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(Math.PI / 4);

            this.ctx.fillStyle = '#dc2626';
            this.ctx.fillRect(-size / 2, -size / 2, size, size);

            this.ctx.strokeStyle = '#7f1d1d';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(-size / 2, -size / 2, size, size);

            this.ctx.restore();
        });
    },

    /**
     * Draw Inazuma line (progress tracking line)
     */
    drawInazumaLine() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const points = [];

        this.tasks.forEach((task, index) => {
            if (!task.startDate || !task.endDate) return;

            const start = new Date(task.startDate);
            const end = new Date(task.endDate);
            const progress = task.progress || 0;

            // Calculate expected progress based on date
            let expectedProgress = 0;
            if (today < start) {
                expectedProgress = 0;
            } else if (today > end) {
                expectedProgress = 100;
            } else {
                const total = end - start;
                const elapsed = today - start;
                expectedProgress = (elapsed / total) * 100;
            }

            // Calculate actual progress position
            const startCol = this.getColumnForDate(start);
            const endCol = this.getColumnForDate(end);
            const taskDuration = endCol - startCol;
            const progressCol = startCol + (taskDuration * progress / 100);

            const x = progressCol * this.columnWidth + this.columnWidth / 2;
            const y = this.headerHeight + index * this.rowHeight + this.rowHeight / 2;

            points.push({
                x,
                y,
                task,
                progress,
                expectedProgress,
                diff: progress - expectedProgress
            });
        });

        if (points.length < 2) return;

        // Draw zigzag line (Inazuma = lightning) connecting progress points
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#dc2626';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        points.forEach((point, i) => {
            if (i === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                const prevPoint = points[i - 1];
                // Draw horizontal line first, then vertical (creates zigzag)
                this.ctx.lineTo(point.x, prevPoint.y);
                this.ctx.lineTo(point.x, point.y);
            }
        });

        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw points
        points.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = point.diff >= 0 ? '#22c55e' : '#dc2626';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
    }
};
