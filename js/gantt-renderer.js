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
    headerHeight: 0, // No header space in canvas
    tasks: [],
    showDependencies: false,
    showInazuma: true,
    showMilestones: true,
    showHierarchy: true,
    progressDisplayMode: 'bar', // 'bar' | 'percentage' | 'both'

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

        // Setup visibility controls
        this.setupVisibilityControls();

        // Setup double-click to edit
        this.setupTaskClickHandlers();

        // console.log('Gantt Renderer initialized');
        return true;
    },

    /**
     * Setup visibility control checkboxes
     */
    setupVisibilityControls() {
        // Load saved settings
        this.loadDisplaySettings();

        const showDependencies = document.getElementById('show-dependencies');
        const showInazuma = document.getElementById('show-inazuma');
        const showMilestones = document.getElementById('show-milestones');
        const showHierarchy = document.getElementById('show-hierarchy');
        const progressDisplayMode = document.getElementById('progress-display-mode');

        // Set initial checkbox states from loaded settings
        if (showDependencies) {
            showDependencies.checked = this.showDependencies;
            showDependencies.addEventListener('change', (e) => {
                this.showDependencies = e.target.checked;
                this.saveDisplaySettings();
                UIController.renderGanttChart();
            });
        }

        if (showInazuma) {
            showInazuma.checked = this.showInazuma;
            showInazuma.addEventListener('change', (e) => {
                this.showInazuma = e.target.checked;
                this.saveDisplaySettings();
                UIController.renderGanttChart();
            });
        }

        if (showMilestones) {
            showMilestones.checked = this.showMilestones;
            showMilestones.addEventListener('change', (e) => {
                this.showMilestones = e.target.checked;
                this.saveDisplaySettings();
                UIController.renderGanttChart();
            });
        }

        if (showHierarchy) {
            showHierarchy.checked = this.showHierarchy;
            showHierarchy.addEventListener('change', (e) => {
                this.showHierarchy = e.target.checked;
                this.saveDisplaySettings();
                UIController.renderGanttChart();
            });
        }

        if (progressDisplayMode) {
            progressDisplayMode.value = this.progressDisplayMode;
            progressDisplayMode.addEventListener('change', (e) => {
                this.progressDisplayMode = e.target.value;
                this.saveDisplaySettings();
                UIController.renderGanttChart();
            });
        }
    },

    /**
     * Save display settings to localStorage
     */
    saveDisplaySettings() {
        const settings = {
            showDependencies: this.showDependencies,
            showInazuma: this.showInazuma,
            showMilestones: this.showMilestones,
            showHierarchy: this.showHierarchy,
            progressDisplayMode: this.progressDisplayMode
        };
        localStorage.setItem('gantt-display-settings', JSON.stringify(settings));
    },

    /**
     * Load display settings from localStorage
     */
    loadDisplaySettings() {
        const saved = localStorage.getItem('gantt-display-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.showDependencies = settings.showDependencies !== undefined ? settings.showDependencies : true;
                this.showInazuma = settings.showInazuma !== undefined ? settings.showInazuma : true;
                this.showMilestones = settings.showMilestones !== undefined ? settings.showMilestones : true;
                this.showHierarchy = settings.showHierarchy !== undefined ? settings.showHierarchy : true;
                this.progressDisplayMode = settings.progressDisplayMode || 'bar';
            } catch (e) {
                console.error('Failed to load display settings:', e);
            }
        }
    },

    /**
     * Setup task click handlers for editing
     */
    setupTaskClickHandlers() {
        if (!this.canvas) return;

        this.canvas.addEventListener('dblclick', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Find which task was clicked
            const clickedTask = this.getTaskAtPosition(x, y);
            if (clickedTask) {
                UIController.showEditTaskModal(clickedTask.id);
            }
        });

        // Change cursor on hover
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const task = this.getTaskAtPosition(x, y);
            this.canvas.style.cursor = task ? 'pointer' : 'default';
        });
    },

    /**
     * Get task at mouse position
     */
    getTaskAtPosition(x, y) {
        const adjustedY = y - this.headerHeight;
        const rowIndex = Math.floor(adjustedY / this.rowHeight);

        if (rowIndex < 0 || rowIndex >= this.tasks.length) return null;

        const task = this.tasks[rowIndex];
        if (!task.startDate || !task.endDate) return null;

        const startCol = this.getColumnForDate(task.startDate);
        const endCol = this.getColumnForDate(task.endDate);

        if (startCol === null || endCol === null) return null;

        const taskX = startCol * this.columnWidth;
        const taskWidth = (endCol - startCol + 1) * this.columnWidth;
        const taskY = this.headerHeight + rowIndex * this.rowHeight + 8;
        const taskHeight = this.rowHeight - 16;

        // Check if click is within task bar bounds
        if (x >= taskX && x <= taskX + taskWidth &&
            y >= taskY && y <= taskY + taskHeight) {
            return task;
        }

        return null;
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

        // Draw dependencies (arrows)
        if (this.showDependencies) {
            this.drawDependencies();
        }

        // Draw milestones
        if (this.showMilestones) {
            this.drawMilestones();
        }

        // Draw Inazuma line (progress line)
        if (this.showInazuma) {
            this.drawInazumaLine();
        }

        // Draw parent-child hierarchy lines
        if (this.showHierarchy) {
            this.drawHierarchyLines();
        }

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

        // Draw vertical lines (columns) and weekend/holiday backgrounds
        for (let i = 0; i <= columnCount; i++) {
            const x = i * this.columnWidth;
            const date = this.getDateForColumn(i);

            // Draw weekend/holiday backgrounds (if enabled in settings)
            const settings = Storage.getSettings();
            if (this.timeScale === 'day' && date && settings.showWeekends !== false) {
                const isSaturday = Utils.isSaturday(date);
                const isSunday = Utils.isSunday(date);
                const isHoliday = Utils.isHoliday(date);

                if (isSaturday) {
                    // 土曜 - 薄い青（ヘッダーの下から）
                    this.ctx.fillStyle = '#eff6ff';
                    this.ctx.fillRect(x, this.headerHeight, this.columnWidth, this.canvas.height - this.headerHeight);
                } else if (isSunday || isHoliday) {
                    // 日曜・祝日 - 薄い赤（ヘッダーの下から）
                    this.ctx.fillStyle = '#fef2f2';
                    this.ctx.fillRect(x, this.headerHeight, this.columnWidth, this.canvas.height - this.headerHeight);
                }
            }

            // Draw vertical grid line
            this.ctx.strokeStyle = '#e2e8f0';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Draw horizontal lines (rows)
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= rowCount; i++) {
            const y = i * this.rowHeight;
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

        let startCol = this.getColumnForDate(task.startDate);
        let endCol = this.getColumnForDate(task.endDate);

        if (startCol === null || endCol === null) return;

        // Check if task has children (parent task)
        // Note: Check against all tasks, not just visible ones
        const allTasks = WBSManager.getTasks();
        const hasChildren = allTasks.some(t => t.parentId === task.id);

        // Check if this task is selected
        const isSelected = UIController.selectedTaskId === task.id;

        const x = startCol * this.columnWidth;
        const y = this.headerHeight + rowIndex * this.rowHeight + 8;
        const width = (endCol - startCol + 1) * this.columnWidth;
        const height = this.rowHeight - 16;

        // Draw selection background if selected
        if (isSelected) {
            this.ctx.fillStyle = 'rgba(37, 99, 235, 0.15)';
            this.ctx.fillRect(0, this.headerHeight + rowIndex * this.rowHeight, this.canvas.width, this.rowHeight);
        }

        // Get base color based on status (or parent's color if child task)
        const baseColor = this.getBaseColorForTask(task, allTasks);

        // Use same color for parent and children (only drawing style differs)
        const color = baseColor;

        if (hasChildren) {
            // Draw parent task as summary bar (top and bottom lines only)
            const midY = y + height / 2;

            // Draw main bar background (center bar)
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, midY - 2, width, 4);

            // Draw top and bottom caps (darker)
            this.ctx.fillStyle = this.darkenColor(color, 0.15);
            this.ctx.fillRect(x, y, 6, height); // Left cap
            this.ctx.fillRect(x + width - 6, y, 6, height); // Right cap

            // Draw top line
            this.ctx.fillRect(x, y, width, 3);
            // Draw bottom line
            this.ctx.fillRect(x, y + height - 3, width, 3);

            // Note: No white background for parent tasks
        } else {
            // Draw normal task bar
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, width, height);

            // Draw progress
            if (task.progress > 0) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                const progressWidth = (width * task.progress) / 100;
                this.ctx.fillRect(x, y, progressWidth, height);
            }

            // Draw border
            this.ctx.strokeStyle = this.darkenColor(color, 0.15);
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, width, height);
        }

        // Draw text based on progress display mode
        this.ctx.font = hasChildren ? 'bold 13px sans-serif' : '12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';

        let text = task.name;

        // Add progress percentage to text if needed
        if (this.progressDisplayMode === 'percentage') {
            text = `${task.progress}%`;
        } else if (this.progressDisplayMode === 'both') {
            text = `${task.name} (${task.progress}%)`;
        }

        const textX = x + 8;
        const textY = y + height / 2;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x, y, width, height);
        this.ctx.clip();

        // Use different text color for parent tasks
        if (hasChildren) {
            // Parent task: dark text with white outline for better visibility
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(text, textX, textY);
            this.ctx.fillStyle = this.darkenColor(color, 0.5);
            this.ctx.fillText(text, textX, textY);
        } else {
            // Regular task: white text
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(text, textX, textY);
        }

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
     * Get base color for task (considering parent's color)
     */
    getBaseColorForTask(task, allTasks) {
        // If task has parent, use parent's base color
        if (task.parentId) {
            const parent = allTasks.find(t => t.id === task.parentId);
            if (parent) {
                // Recursively get parent's base color
                return this.getBaseColorForTask(parent, allTasks);
            }
        }

        // Use task's own color or status color
        return this.getTaskColor(task);
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
     * Lighten color
     */
    lightenColor(color, amount) {
        // Convert hex to rgb and increase values towards white
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
        const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
        const newB = Math.min(255, Math.floor(b + (255 - b) * amount));

        return `rgb(${newR}, ${newG}, ${newB})`;
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
            const isSaturday = Utils.isSaturday(date);
            const isSunday = Utils.isSunday(date);
            const isHoliday = Utils.isHoliday(date);

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
            if (isSaturday) classes.push('saturday');
            if (isSunday || isHoliday) classes.push('sunday-holiday');

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
            if (!task.startDate || !task.endDate) {
                return;
            }

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
                taskIndex: index,
                task,
                progress,
                expectedProgress,
                diff: progress - expectedProgress
            });
        });

        if (points.length === 0) return;

        // Sort points by Y coordinate (top to bottom, task order)
        // This ensures the line follows the task list order
        const sortedPoints = [...points].sort((a, b) => a.y - b.y);

        // Draw zigzag line (Inazuma = lightning) connecting progress points
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#dc2626';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        sortedPoints.forEach((point, i) => {
            if (i === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                const prevPoint = sortedPoints[i - 1];
                // Draw horizontal line first, then vertical (creates zigzag)
                this.ctx.lineTo(point.x, prevPoint.y);
                this.ctx.lineTo(point.x, point.y);
            }
        });

        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw points (use sorted order)
        sortedPoints.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = point.diff >= 0 ? '#22c55e' : '#dc2626';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
    },

    /**
     * Draw parent-child hierarchy lines
     */
    drawHierarchyLines() {
        const allTasks = WBSManager.getTasks();

        // Find parent-child relationships
        const hierarchyLines = [];
        this.tasks.forEach((task, taskIndex) => {
            if (task.parentId) {
                // Find parent in visible tasks
                const parentIndex = this.tasks.findIndex(t => t.id === task.parentId);
                if (parentIndex !== -1) {
                    hierarchyLines.push({
                        parentIndex,
                        childIndex: taskIndex,
                        parent: this.tasks[parentIndex],
                        child: task
                    });
                }
            }
        });

        if (hierarchyLines.length === 0) return;

        // Draw lines
        this.ctx.save();
        this.ctx.strokeStyle = '#94a3b8';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);

        hierarchyLines.forEach(line => {
            const parentY = this.headerHeight + line.parentIndex * this.rowHeight + this.rowHeight / 2;
            const childY = this.headerHeight + line.childIndex * this.rowHeight + this.rowHeight / 2;

            // Get parent task bar position
            let parentStartCol = null;
            let parentEndCol = null;
            if (line.parent.startDate && line.parent.endDate) {
                parentStartCol = this.getColumnForDate(line.parent.startDate);
                parentEndCol = this.getColumnForDate(line.parent.endDate);
            }

            // Get child task bar position
            let childStartCol = null;
            if (line.child.startDate) {
                childStartCol = this.getColumnForDate(line.child.startDate);
            }

            // Draw connection line from parent bar left to child bar left
            if (parentStartCol !== null && childStartCol !== null) {
                const parentX = parentStartCol * this.columnWidth;
                const childX = childStartCol * this.columnWidth;

                this.ctx.beginPath();
                this.ctx.moveTo(parentX, parentY);

                // Draw L-shaped line: vertical then horizontal
                const midY = (parentY + childY) / 2;
                this.ctx.lineTo(parentX, midY);
                this.ctx.lineTo(childX, midY);
                this.ctx.lineTo(childX, childY);

                this.ctx.stroke();

                // Draw arrow at child
                this.drawArrowHead(childX, childY, 0); // pointing right
            }
        });

        this.ctx.restore();
    },

    /**
     * Draw arrow head
     */
    drawArrowHead(x, y, angle) {
        const size = 6;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-size, -size / 2);
        this.ctx.lineTo(-size, size / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = this.ctx.strokeStyle;
        this.ctx.fill();
        this.ctx.restore();
    },

    /**
     * Scroll to today's date in gantt chart
     */
    scrollToToday() {
        if (!this.canvas) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if today is within the visible date range
        if (today < this.startDate || today > this.endDate) {
            Utils.showNotification('現在日がプロジェクト期間外です', 'warning');
            return;
        }

        // Calculate column position for today
        const todayCol = this.getColumnForDate(today);
        if (todayCol === null) return;

        // Calculate scroll position (center today in viewport)
        const scrollX = (todayCol * this.columnWidth) - (this.canvas.parentElement.clientWidth / 2);

        // Scroll the gantt chart panel
        const ganttPanel = this.canvas.parentElement;
        if (ganttPanel) {
            ganttPanel.scrollLeft = Math.max(0, scrollX);
            Utils.showNotification('今日の日付に移動しました', 'success');
        }
    }
};
