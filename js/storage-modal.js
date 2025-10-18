/**
 * Storage Modal Manager
 * ストレージ情報モーダルを管理
 */

const StorageModal = {
  init() {
    this.setupEventListeners();
  },

  setupEventListeners() {
    // ストレージボタン
    const storageBtn = document.getElementById('storage-btn');
    if (storageBtn) {
      storageBtn.addEventListener('click', () => this.openModal());
    }

    // 閉じるボタン
    const closeBtn = document.getElementById('storage-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    // モーダル外クリックで閉じる
    const modal = document.getElementById('storage-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }
  },

  /**
   * モーダルを開く
   */
  openModal() {
    this.loadStorageInfo();
    const modal = document.getElementById('storage-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  /**
   * モーダルを閉じる
   */
  closeModal() {
    const modal = document.getElementById('storage-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /**
   * ストレージ情報を読み込み
   */
  loadStorageInfo() {
    const container = document.getElementById('storage-content');
    if (!container) return;

    const storageData = this.calculateStorageUsage();

    container.innerHTML = `
      <div class="storage-summary">
        <div class="storage-usage-bar">
          <div class="storage-usage-fill" style="width: ${storageData.percentageUsed}%"></div>
        </div>
        <div class="storage-stats">
          <div class="storage-stat">
            <span class="storage-label">使用量:</span>
            <span class="storage-value">${storageData.usedKB} KB</span>
          </div>
          <div class="storage-stat">
            <span class="storage-label">上限:</span>
            <span class="storage-value">${storageData.totalMB} MB</span>
          </div>
          <div class="storage-stat">
            <span class="storage-label">使用率:</span>
            <span class="storage-value">${storageData.percentageUsed.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div class="storage-breakdown">
        <h4>データ内訳</h4>
        <div class="storage-items">
          ${storageData.items.map(item => `
            <div class="storage-item">
              <div class="storage-item-name">${item.name}</div>
              <div class="storage-item-size">${item.size} KB</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="storage-note">
        <p>💡 <strong>ヒント:</strong> 定期的にデータをエクスポートしてバックアップを取りましょう。</p>
      </div>
    `;
  },

  /**
   * ストレージ使用量を計算
   */
  calculateStorageUsage() {
    const totalMB = 10; // LocalStorageの推定上限
    let totalBytes = 0;
    const items = [];

    // LocalStorageの各キーのサイズを計算
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key);
        const bytes = new Blob([value]).size;
        const kb = (bytes / 1024).toFixed(2);

        totalBytes += bytes;

        // 主要なキーのみ表示
        if (key.startsWith('wbs-') || key === 'projects' || key === 'tasks') {
          let displayName = key;
          if (key === 'wbs-projects') displayName = 'プロジェクト';
          else if (key === 'wbs-tasks') displayName = 'タスク';
          else if (key === 'wbs-members') displayName = 'メンバー';
          else if (key === 'wbs-sprints') displayName = 'スプリント';
          else if (key === 'wbs-settings') displayName = '設定';
          else if (key === 'wbs-tool-visited') displayName = '訪問履歴';

          items.push({
            name: displayName,
            size: kb
          });
        }
      }
    }

    const usedKB = (totalBytes / 1024).toFixed(2);
    const usedMB = (totalBytes / 1024 / 1024).toFixed(2);
    const percentageUsed = (usedMB / totalMB) * 100;

    return {
      usedKB,
      usedMB,
      totalMB,
      percentageUsed: Math.min(percentageUsed, 100),
      items: items.sort((a, b) => parseFloat(b.size) - parseFloat(a.size))
    };
  },

  /**
   * データをエクスポート
   */
  exportData() {
    // 既存のエクスポート機能を呼び出し
    if (window.WBSManager && window.WBSManager.exportData) {
      window.WBSManager.exportData();
      this.closeModal();
    } else {
      alert('エクスポート機能が利用できません');
    }
  },

  /**
   * データをクリア
   */
  clearData() {
    const confirmed = confirm(
      'すべてのデータを削除しますか？\n\nこの操作は取り消せません。事前にエクスポートしてバックアップを取ることを推奨します。'
    );

    if (confirmed) {
      const doubleConfirm = confirm('本当によろしいですか？すべてのプロジェクト、タスク、設定が削除されます。');

      if (doubleConfirm) {
        // WBS関連のデータのみクリア
        const keysToRemove = [];
        for (let key in localStorage) {
          if (key.startsWith('wbs-') || key === 'projects' || key === 'tasks') {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));

        alert('データがクリアされました。ページを再読み込みします。');
        this.closeModal();
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  }
};

// ページ読み込み時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => StorageModal.init());
} else {
  StorageModal.init();
}
