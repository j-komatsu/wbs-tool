/**
 * Import/Export Manager
 * Handles data import and export in various formats
 */

const ImportExport = {
    /**
     * Export project as JSON
     */
    exportJSON(project = null) {
        const data = project || WBSManager.currentProject;
        if (!data) {
            Utils.showNotification('エクスポートするプロジェクトがありません', 'error');
            return;
        }

        const json = JSON.stringify(data, null, 2);
        const filename = `${data.name}_${Utils.formatDate(new Date())}.json`;

        Utils.downloadFile(json, filename, 'application/json');
        Utils.showNotification('JSONファイルをエクスポートしました', 'success');
    },

    /**
     * Export all projects as JSON
     */
    exportAllJSON() {
        const data = Storage.exportAll();
        const json = JSON.stringify(data, null, 2);
        const filename = `wbs-tool-backup_${Utils.formatDate(new Date())}.json`;

        Utils.downloadFile(json, filename, 'application/json');
        Utils.showNotification('すべてのデータをエクスポートしました', 'success');
    },

    /**
     * Export project as CSV
     */
    exportCSV(project = null) {
        const data = project || WBSManager.currentProject;
        if (!data) {
            Utils.showNotification('エクスポートするプロジェクトがありません', 'error');
            return;
        }

        const tasks = data.tasks || [];
        const csvData = this.convertTasksToCSV(tasks);

        // Add BOM for UTF-8 (Excel compatibility)
        const bom = '\uFEFF';
        const csv = bom + csvData;

        const filename = `${data.name}_tasks_${Utils.formatDate(new Date())}.csv`;
        Utils.downloadFile(csv, filename, 'text/csv;charset=utf-8');
        Utils.showNotification('CSVファイルをエクスポートしました', 'success');
    },

    /**
     * Convert tasks to CSV format
     */
    convertTasksToCSV(tasks) {
        // CSV headers
        const headers = [
            'ID',
            'タスク名',
            '種別',
            'ステータス',
            '優先度',
            '開始日',
            '終了日',
            '進捗率',
            'ストーリーポイント',
            '担当者',
            '説明',
            '受け入れ基準',
            '親タスクID',
            '階層レベル'
        ];

        const rows = [headers];

        // Get task hierarchy
        const hierarchy = DataModel.getTaskHierarchy(tasks);

        hierarchy.forEach(task => {
            const row = [
                task.id,
                task.name,
                task.type,
                task.status,
                task.priority,
                task.startDate || '',
                task.endDate || '',
                task.progress,
                task.storyPoints || '',
                task.assignee || '',
                task.description || '',
                task.acceptanceCriteria || '',
                task.parentId || '',
                task.level || 0
            ];

            // Escape and quote fields containing commas or quotes
            const escapedRow = row.map(field => {
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            });

            rows.push(escapedRow);
        });

        return rows.map(row => row.join(',')).join('\n');
    },

    /**
     * Export project as TSV
     */
    exportTSV(project = null) {
        const data = project || WBSManager.currentProject;
        if (!data) {
            Utils.showNotification('エクスポートするプロジェクトがありません', 'error');
            return;
        }

        const tasks = data.tasks || [];
        const tsvData = this.convertTasksToTSV(tasks);

        const filename = `${data.name}_tasks_${Utils.formatDate(new Date())}.tsv`;
        Utils.downloadFile(tsvData, filename, 'text/tab-separated-values;charset=utf-8');
        Utils.showNotification('TSVファイルをエクスポートしました', 'success');
    },

    /**
     * Convert tasks to TSV format
     */
    convertTasksToTSV(tasks) {
        const headers = [
            'ID',
            'タスク名',
            '種別',
            'ステータス',
            '優先度',
            '開始日',
            '終了日',
            '進捗率',
            'ストーリーポイント',
            '担当者',
            '説明',
            '親タスクID',
            '階層レベル'
        ];

        const rows = [headers];
        const hierarchy = DataModel.getTaskHierarchy(tasks);

        hierarchy.forEach(task => {
            const row = [
                task.id,
                task.name,
                task.type,
                task.status,
                task.priority,
                task.startDate || '',
                task.endDate || '',
                task.progress,
                task.storyPoints || '',
                task.assignee || '',
                task.description || '',
                task.parentId || '',
                task.level || 0
            ];

            rows.push(row);
        });

        return rows.map(row => row.join('\t')).join('\n');
    },

    /**
     * Import JSON file
     */
    async importJSON(file) {
        try {
            const text = await this.readFile(file);
            const data = JSON.parse(text);

            // Validate data
            if (data.version && data.projects) {
                // Full backup file
                if (!confirm('すべてのプロジェクトを上書きしますか？\n現在のデータはバックアップされます。')) {
                    return;
                }
                Storage.importAll(data);

                // Reload current project
                const projects = Storage.getProjects();
                if (projects.length > 0) {
                    Storage.setCurrentProject(projects[0].id);
                    UIController.loadProject(projects[0].id);
                }
            } else if (data.id && data.tasks) {
                // Single project file
                if (!confirm(`プロジェクト「${data.name}」をインポートしますか？`)) {
                    return;
                }

                // Check if project already exists
                const existing = Storage.getProject(data.id);
                if (existing) {
                    if (!confirm('同じIDのプロジェクトが存在します。上書きしますか？')) {
                        // Generate new ID
                        data.id = Utils.generateUUID();
                        data.name = data.name + ' (コピー)';
                    }
                }

                // Validate project
                const validation = DataModel.validateProject(data);
                if (!validation.valid) {
                    throw new Error('無効なプロジェクトデータ: ' + validation.errors.join(', '));
                }

                // Save project
                Storage.saveProject(data);
                Storage.setCurrentProject(data.id);
                UIController.loadProject(data.id);

                Utils.showNotification('プロジェクトをインポートしました', 'success');
            } else {
                throw new Error('無効なJSONファイル形式です');
            }
        } catch (error) {
            console.error('Import error:', error);
            Utils.showNotification('インポートに失敗しました: ' + error.message, 'error');
        }
    },

    /**
     * Import CSV file
     */
    async importCSV(file) {
        try {
            const text = await this.readFile(file);
            const tasks = this.parseCSV(text);

            if (tasks.length === 0) {
                throw new Error('タスクが見つかりませんでした');
            }

            if (!confirm(`${tasks.length}個のタスクをインポートしますか？\n現在のタスクは削除されます。`)) {
                return;
            }

            // Replace current project tasks
            WBSManager.tasks = tasks;
            WBSManager.save();
            UIController.refresh();

            Utils.showNotification(`${tasks.length}個のタスクをインポートしました`, 'success');
        } catch (error) {
            console.error('CSV import error:', error);
            Utils.showNotification('CSVのインポートに失敗しました: ' + error.message, 'error');
        }
    },

    /**
     * Parse CSV text
     */
    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSVデータが空です');
        }

        // Parse header
        const headers = this.parseCSVLine(lines[0]);
        const tasks = [];

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === 0) continue;

            const task = {};
            headers.forEach((header, index) => {
                const value = values[index] || '';

                // Map CSV headers to task properties
                switch (header) {
                    case 'ID':
                        task.id = value || Utils.generateUUID();
                        break;
                    case 'タスク名':
                        task.name = value;
                        break;
                    case '種別':
                        task.type = value || 'task';
                        break;
                    case 'ステータス':
                        task.status = value || 'todo';
                        break;
                    case '優先度':
                        task.priority = value || 'medium';
                        break;
                    case '開始日':
                        task.startDate = value || null;
                        break;
                    case '終了日':
                        task.endDate = value || null;
                        break;
                    case '進捗率':
                        task.progress = parseInt(value) || 0;
                        break;
                    case 'ストーリーポイント':
                        task.storyPoints = value ? parseInt(value) : null;
                        break;
                    case '担当者':
                        task.assignee = value || null;
                        break;
                    case '説明':
                        task.description = value || '';
                        break;
                    case '受け入れ基準':
                        task.acceptanceCriteria = value || '';
                        break;
                    case '親タスクID':
                        task.parentId = value || null;
                        break;
                }
            });

            // Set default values
            task.order = i - 1;
            task.dependencies = [];
            task.tags = [];
            task.history = [];
            task.isMilestone = false;
            task.sprintId = null;
            task.color = null;
            task.duration = task.startDate && task.endDate
                ? DataModel.calculateDuration(task.startDate, task.endDate)
                : 1;

            if (task.name) {
                tasks.push(task);
            }
        }

        return tasks;
    },

    /**
     * Parse single CSV line (handles quoted fields)
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // Toggle quotes
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    },

    /**
     * Read file as text
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsText(file, 'UTF-8');
        });
    },

    /**
     * Show export dialog
     */
    showExportDialog() {
        const options = [
            { value: 'json', label: 'JSON (完全なプロジェクトデータ)' },
            { value: 'json-all', label: 'JSON (すべてのプロジェクト)' },
            { value: 'csv', label: 'CSV (Excel互換)' },
            { value: 'tsv', label: 'TSV (タブ区切り)' }
        ];

        // Create dialog HTML
        const html = `
            <div class="export-dialog">
                <h3>エクスポート形式を選択</h3>
                ${options.map(opt => `
                    <button class="export-option-btn" data-format="${opt.value}">
                        ${opt.label}
                    </button>
                `).join('')}
            </div>
        `;

        // Show as notification (simple implementation)
        // In production, use a proper modal dialog
        const format = prompt(
            'エクスポート形式を選択してください:\n' +
            '1: JSON (現在のプロジェクト)\n' +
            '2: JSON (すべてのプロジェクト)\n' +
            '3: CSV\n' +
            '4: TSV',
            '1'
        );

        switch (format) {
            case '1':
                this.exportJSON();
                break;
            case '2':
                this.exportAllJSON();
                break;
            case '3':
                this.exportCSV();
                break;
            case '4':
                this.exportTSV();
                break;
            default:
                if (format !== null) {
                    Utils.showNotification('無効な選択です', 'error');
                }
        }
    },

    /**
     * Show import dialog
     */
    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv,.tsv';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const ext = Utils.getFileExtension(file.name).toLowerCase();

            switch (ext) {
                case 'json':
                    await this.importJSON(file);
                    break;
                case 'csv':
                    await this.importCSV(file);
                    break;
                case 'tsv':
                    // Similar to CSV but with tab separator
                    Utils.showNotification('TSVインポートは未実装です', 'warning');
                    break;
                default:
                    Utils.showNotification('サポートされていないファイル形式です', 'error');
            }
        };

        input.click();
    }
};
