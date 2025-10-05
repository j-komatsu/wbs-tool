/**
 * Utility Functions
 * Common helper functions used throughout the application
 */

const Utils = {
    /**
     * Generate a UUID v4
     * @returns {string} UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Format date to YYYY-MM-DD
     * @param {Date|string} date - Date object or ISO string
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Format date to Japanese format (YYYY年MM月DD日)
     * @param {Date|string} date - Date object or ISO string
     * @returns {string} Formatted date string
     */
    formatDateJP(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        return `${year}年${month}月${day}日`;
    },

    /**
     * Format datetime to YYYY-MM-DD HH:MM
     * @param {Date|string} date - Date object or ISO string
     * @returns {string} Formatted datetime string
     */
    formatDateTime(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const datePart = this.formatDate(d);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${datePart} ${hours}:${minutes}`;
    },

    /**
     * Calculate difference in days between two dates
     * @param {Date|string} start - Start date
     * @param {Date|string} end - End date
     * @returns {number} Number of days
     */
    daysDiff(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diff = endDate.getTime() - startDate.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },

    /**
     * Add days to a date
     * @param {Date|string} date - Starting date
     * @param {number} days - Number of days to add
     * @returns {Date} New date
     */
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    /**
     * Check if date is weekend
     * @param {Date|string} date - Date to check
     * @returns {boolean} True if weekend
     */
    isWeekend(date) {
        const d = new Date(date);
        const day = d.getDay();
        return day === 0 || day === 6;
    },

    /**
     * Get week number
     * @param {Date|string} date - Date
     * @returns {number} Week number
     */
    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    /**
     * Sanitize HTML string to prevent XSS
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    sanitizeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Escape HTML special characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Calculate progress percentage
     * @param {number} completed - Completed value
     * @param {number} total - Total value
     * @returns {number} Percentage (0-100)
     */
    calculateProgress(completed, total) {
        if (total === 0) return 0;
        return Math.round((completed / total) * 100);
    },

    /**
     * Sort array of objects by property
     * @param {Array} arr - Array to sort
     * @param {string} property - Property to sort by
     * @param {boolean} ascending - Sort order
     * @returns {Array} Sorted array
     */
    sortByProperty(arr, property, ascending = true) {
        return arr.sort((a, b) => {
            const aVal = a[property];
            const bVal = b[property];

            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            const comparison = aVal < bVal ? -1 : 1;
            return ascending ? comparison : -comparison;
        });
    },

    /**
     * Group array by property
     * @param {Array} arr - Array to group
     * @param {string} property - Property to group by
     * @returns {Object} Grouped object
     */
    groupBy(arr, property) {
        return arr.reduce((acc, obj) => {
            const key = obj[property] || 'undefined';
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(obj);
            return acc;
        }, {});
    },

    /**
     * Download file
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Get file extension
     * @param {string} filename - File name
     * @returns {string} File extension
     */
    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    },

    /**
     * Convert CSV to array
     * @param {string} csv - CSV string
     * @returns {Array} Array of objects
     */
    csvToArray(csv) {
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];

        const headers = lines[0].split(',').map(h => h.trim());
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const currentLine = lines[i].split(',');

            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentLine[j] ? currentLine[j].trim() : '';
            }
            result.push(obj);
        }

        return result;
    },

    /**
     * Convert array to CSV
     * @param {Array} arr - Array of objects
     * @returns {string} CSV string
     */
    arrayToCSV(arr) {
        if (arr.length === 0) return '';

        const headers = Object.keys(arr[0]);
        const csv = [headers.join(',')];

        for (const obj of arr) {
            const row = headers.map(header => {
                const value = obj[header] || '';
                // Escape quotes and wrap in quotes if contains comma
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csv.push(row.join(','));
        }

        return csv.join('\n');
    },

    /**
     * Show notification (simple toast)
     * @param {string} message - Notification message
     * @param {string} type - Type (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 20px;
            background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    /**
     * Confirm dialog
     * @param {string} message - Confirmation message
     * @returns {boolean} User response
     */
    confirm(message) {
        return window.confirm(message);
    },

    /**
     * Get label for task type
     * @param {string} type - Task type
     * @returns {string} Japanese label
     */
    getTaskTypeLabel(type) {
        const labels = {
            epic: 'エピック',
            story: 'ストーリー',
            task: 'タスク',
            bug: 'バグ'
        };
        return labels[type] || 'タスク';
    },

    /**
     * Get color for task type
     * @param {string} type - Task type
     * @returns {string} Color code
     */
    getTaskTypeColor(type) {
        const colors = {
            epic: '#2563eb',
            story: '#10b981',
            task: '#6366f1',
            bug: '#ef4444'
        };
        return colors[type] || '#64748b';
    },

    /**
     * Get color for priority
     * @param {string} priority - Priority level
     * @returns {string} Color code
     */
    getPriorityColor(priority) {
        const colors = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#94a3b8'
        };
        return colors[priority] || '#64748b';
    },

    /**
     * Get color for status
     * @param {string} status - Status
     * @returns {string} Color code
     */
    getStatusColor(status) {
        const colors = {
            todo: '#94a3b8',
            in_progress: '#3b82f6',
            review: '#f59e0b',
            done: '#10b981'
        };
        return colors[status] || '#64748b';
    }
};

// Add CSS animations if not already present
if (!document.getElementById('utils-animations')) {
    const style = document.createElement('style');
    style.id = 'utils-animations';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}
