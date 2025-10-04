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

        // Draw tasks
        this.drawTasks();

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
        const height = rowCount * this.rowHeight;

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

        // Draw vertical lines (columns)
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= columnCount; i++) {
            const x = i * this.columnWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();

            // Highlight weekends
            if (this.timeScale === 'day') {
                const date = this.getDateForColumn(i);
                if (Utils.isWeekend(date)) {
                    this.ctx.fillStyle = '#f8fafc';
                    this.ctx.fillRect(x, 0, this.columnWidth, this.canvas.height);
                }
            }
        }

        // Draw horizontal lines (rows)
        for (let i = 0; i <= rowCount; i++) {
            const y = i * this.rowHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
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
        const y = rowIndex * this.rowHeight + 8;
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
        this.ctx.moveTo(x, 0);
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
    }
};
