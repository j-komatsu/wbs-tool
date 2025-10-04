# WBS Tool - 実装ロードマップ

## 📋 目次
1. [開発優先順位](#開発優先順位)
2. [フェーズ別実装計画](#フェーズ別実装計画)
3. [技術的考慮事項](#技術的考慮事項)
4. [UX/UI改善ポイント](#uxui改善ポイント)
5. [テスト戦略](#テスト戦略)
6. [パフォーマンス最適化](#パフォーマンス最適化)

---

## 開発優先順位

### 🔴 Critical（MVP必須）

#### Phase 0: 基盤整備（1-2日）
```
✅ プロジェクト構造・ドキュメント
⬜ utils.js - ユーティリティ関数
⬜ storage.js - LocalStorage管理
⬜ data-model.js - データモデル定義
```

#### Phase 1: コア機能（3-5日）
```
⬜ wbs-manager.js - タスク管理ロジック
⬜ ui-controller.js - UI制御（基本）
⬜ app.js - アプリケーション初期化
```

**受け入れ基準:**
- タスクCRUD操作が可能
- ローカルストレージ保存・読み込み
- 基本的なフィルタリング

#### Phase 2: ガントチャート（3-4日）
```
⬜ gantt-renderer.js - ガントチャート描画
⬜ タイムライン表示（日/週/月）
⬜ タスクバー描画
⬜ 現在日ハイライト
```

**受け入れ基準:**
- ガントチャートの基本表示
- スクロール同期（WBSリストとチャート）
- ズームイン/アウト

### 🟡 High（重要機能）

#### Phase 3: アジャイル基本（4-5日）
```
⬜ sprint-manager.js - スプリント管理
⬜ kanban.js - カンバンボード
⬜ backlog.js - バックログ管理
```

**受け入れ基準:**
- スプリント作成・管理
- カンバンボードでD&D
- バックログ優先順位付け

#### Phase 4: データ連携（2-3日）
```
⬜ import-export.js - インポート/エクスポート
⬜ JSON形式
⬜ CSV/TSV形式
```

**受け入れ基準:**
- JSON完全エクスポート/インポート
- Excel互換CSV出力

### 🟢 Medium（拡張機能）

#### Phase 5: チャート・レポート（5-7日）
```
⬜ charts.js - チャート描画（Chart.js利用）
⬜ dashboard.js - ダッシュボード
⬜ report-generator.js - レポート生成
```

**受け入れ基準:**
- バーンダウン/ベロシティチャート
- KPIダッシュボード
- HTML/PDF レポート出力

#### Phase 6: 高度な機能（3-4日）
```
⬜ イナズマ線表示
⬜ タスク依存関係
⬜ マイルストーン
```

### 🔵 Low（将来拡張）

#### Phase 7: 最適化・改善（継続的）
```
⬜ パフォーマンスチューニング
⬜ アクセシビリティ改善
⬜ PWA対応
```

---

## フェーズ別実装計画

### MVP版（Phase 0-2）- 約1-2週間

**目標:** 基本的なWBS・ガントチャートツールとして動作

**実装内容:**
1. **データ層**
   - LocalStorage CRUD
   - データモデル定義
   - 自動保存機能

2. **UI層**
   - タスクリスト表示
   - タスク編集モーダル
   - ビュー切り替え

3. **ガントチャート**
   - Canvas描画
   - タイムライン生成
   - 基本的なタスクバー

**スキップする機能:**
- アジャイル機能
- チャート・レポート
- 高度な設定

### 完全版（Phase 0-6）- 約3-4週間

**追加機能:**
- スプリント管理
- カンバンボード
- バーンダウン/ベロシティチャート
- レポート自動生成
- イナズマ線
- インポート/エクスポート

---

## 技術的考慮事項

### 1. データ構造の最適化

**課題:** LocalStorageは5-10MB制限

**対策:**
```javascript
// 大量タスク時はIndexedDB検討
if (taskCount > 1000) {
    // IndexedDBに移行
    migrateToIndexedDB();
}

// 圧縮保存
function saveCompressed(data) {
    const compressed = LZString.compress(JSON.stringify(data));
    localStorage.setItem(key, compressed);
}
```

### 2. レンダリングパフォーマンス

**課題:** 1000タスク時のDOM更新が重い

**対策:**
```javascript
// 仮想スクロール実装
// 表示領域のみレンダリング
function renderVisibleTasks(startIndex, endIndex) {
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
        fragment.appendChild(createTaskElement(tasks[i]));
    }
    container.appendChild(fragment);
}

// RequestAnimationFrame活用
requestAnimationFrame(() => {
    renderGanttChart();
});
```

### 3. ガントチャート描画最適化

**OffscreenCanvas活用:**
```javascript
// ワーカースレッドで描画
const worker = new Worker('gantt-worker.js');
worker.postMessage({ tasks, timeScale });
worker.onmessage = (e) => {
    ctx.drawImage(e.data.bitmap, 0, 0);
};
```

### 4. セキュリティ考慮

**XSS対策:**
```javascript
// すべてのユーザー入力をサニタイズ
function sanitize(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// innerHTML禁止、textContentを使用
element.textContent = userInput;
```

### 5. エラーハンドリング

```javascript
// グローバルエラーハンドラ
window.addEventListener('error', (event) => {
    console.error('Error:', event.error);
    showNotification('エラーが発生しました', 'error');
    // エラーログをLocalStorageに保存
    saveErrorLog(event.error);
});

// Promise rejection対応
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
});
```

---

## UX/UI改善ポイント

### 🎯 プロフェッショナル観点での改善提案

#### 1. **オンボーディング体験**

**課題:** 初回訪問時に空画面は不親切

**改善案:**
```javascript
// 初回起動時
if (isFirstVisit()) {
    showWelcomeModal();
    // サンプルプロジェクトを提供
    offerSampleProject();
}
```

**実装:**
- ウェルカムモーダル
- インタラクティブチュートリアル
- サンプルデータ（架空プロジェクト）

#### 2. **操作フィードバックの強化**

**現状の課題:**
- 保存成功/失敗が不明確
- 操作結果の視覚的フィードバック不足

**改善案:**
```javascript
// 楽観的UI更新
function updateTaskOptimistic(task) {
    // 即座にUI反映
    updateUI(task);

    // 非同期で保存
    saveTask(task)
        .then(() => showNotification('保存しました', 'success'))
        .catch(() => {
            // ロールバック
            revertUI();
            showNotification('保存に失敗しました', 'error');
        });
}
```

**追加要素:**
- ローディングスピナー
- プログレスバー
- 成功/エラートースト
- アニメーション（タスク追加時のフェードイン等）

#### 3. **キーボードナビゲーション**

**実装すべきショートカット:**
```
Ctrl/Cmd + N     新規タスク
Ctrl/Cmd + S     保存
Ctrl/Cmd + F     検索
Ctrl/Cmd + Z     元に戻す
Ctrl/Cmd + Y     やり直し
Delete           タスク削除
Enter            タスク編集
Tab              次のフィールド
Shift + Tab      前のフィールド
Esc              モーダルを閉じる
↑/↓              タスク選択
Ctrl + ↑/↓       タスク移動
```

#### 4. **レスポンシブデザイン改善**

**タブレット表示の最適化:**
```css
@media (max-width: 1024px) {
    /* ガントチャート非表示、リストビューのみ */
    .gantt-chart-panel { display: none; }
    .wbs-list-panel { width: 100%; }

    /* タブレット用の専用UI */
    .mobile-gantt-toggle {
        display: block;
    }
}
```

#### 5. **ドラッグ&ドロップのUX改善**

**視覚的フィードバック:**
```javascript
// ドロップ可能エリアのハイライト
dragElement.addEventListener('dragstart', (e) => {
    document.querySelectorAll('.drop-zone')
        .forEach(zone => zone.classList.add('highlight'));
});

// ゴーストイメージのカスタマイズ
e.dataTransfer.setDragImage(customGhost, 0, 0);

// ドロップ位置のプレビュー
dragElement.addEventListener('dragover', (e) => {
    showDropPreview(e.clientY);
});
```

#### 6. **エラー予防**

**削除前の確認:**
```javascript
function deleteTask(taskId) {
    const task = getTask(taskId);

    // 子タスクがある場合
    if (hasChildren(taskId)) {
        showConfirmDialog({
            title: '警告',
            message: `このタスクには${getChildCount(taskId)}個の子タスクがあります。すべて削除されますがよろしいですか？`,
            confirmText: '削除',
            cancelText: 'キャンセル',
            onConfirm: () => performDelete(taskId)
        });
    }
}
```

#### 7. **データ損失防止**

**実装すべき機能:**
```javascript
// 未保存の変更を検知
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// 定期的な自動バックアップ
setInterval(() => {
    createBackup();
}, 5 * 60 * 1000); // 5分ごと

// LocalStorage失敗時の代替
function saveWithFallback(data) {
    try {
        localStorage.setItem(key, data);
    } catch (e) {
        // QuotaExceededError時
        if (e.name === 'QuotaExceededError') {
            // 古いバージョン削除
            cleanupOldVersions();
            // リトライ
            localStorage.setItem(key, data);
        }
    }
}
```

#### 8. **アクセシビリティ**

**WCAG 2.1 AA準拠:**
```html
<!-- ARIA属性の追加 -->
<button aria-label="新規タスクを作成"
        aria-keyshortcuts="Control+N">
    新規タスク
</button>

<!-- フォーカス管理 -->
<div role="dialog"
     aria-modal="true"
     aria-labelledby="modal-title">
```

```javascript
// フォーカストラップ
function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
}
```

#### 9. **データビジュアライゼーションの改善**

**Chart.jsの設定最適化:**
```javascript
// アニメーション無効化（パフォーマンス）
const chartConfig = {
    animation: {
        duration: 0
    },
    // レスポンシブ
    responsive: true,
    maintainAspectRatio: false,
    // ツールチップ
    plugins: {
        tooltip: {
            enabled: true,
            callbacks: {
                label: (context) => {
                    return `${context.dataset.label}: ${context.parsed.y} SP`;
                }
            }
        }
    }
};
```

#### 10. **国際化対応の準備**

**i18n構造:**
```javascript
const i18n = {
    ja: {
        task: {
            new: '新規タスク',
            edit: 'タスク編集',
            delete: 'タスク削除'
        }
    },
    en: {
        task: {
            new: 'New Task',
            edit: 'Edit Task',
            delete: 'Delete Task'
        }
    }
};

function t(key, lang = 'ja') {
    return key.split('.').reduce((obj, k) => obj[k], i18n[lang]);
}
```

---

## テスト戦略

### 1. 単体テスト

**対象:**
- Utils関数
- データモデル
- ストレージ操作

**フレームワーク:** Jest

```javascript
// utils.test.js
describe('Utils', () => {
    test('formatDate formats date correctly', () => {
        const date = new Date('2024-01-15');
        expect(Utils.formatDate(date)).toBe('2024-01-15');
    });

    test('generateUUID creates valid UUID', () => {
        const uuid = Utils.generateUUID();
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
});
```

### 2. 統合テスト

**対象:**
- タスクCRUD操作
- ビュー切り替え
- データ同期

### 3. E2Eテスト

**フレームワーク:** Playwright

```javascript
test('create and save task', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.click('#new-task-btn');
    await page.fill('#task-name', 'Test Task');
    await page.click('#task-save-btn');
    await expect(page.locator('.wbs-task')).toHaveText('Test Task');
});
```

### 4. パフォーマンステスト

**ベンチマーク:**
```javascript
// 1000タスク生成テスト
console.time('Render 1000 tasks');
for (let i = 0; i < 1000; i++) {
    createTask({ name: `Task ${i}` });
}
renderAllTasks();
console.timeEnd('Render 1000 tasks');
// 目標: < 500ms
```

---

## パフォーマンス最適化

### 1. 初期ロード最適化

**目標:** 1秒以内

**施策:**
- CSS/JSの最小化
- 不要なライブラリ削除
- 遅延ロード

```html
<!-- 重要なCSS -->
<link rel="stylesheet" href="css/critical.css">

<!-- 非同期ロード -->
<link rel="preload" href="css/non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

### 2. レンダリング最適化

**仮想スクロール実装:**
```javascript
class VirtualScroller {
    constructor(container, items, rowHeight) {
        this.container = container;
        this.items = items;
        this.rowHeight = rowHeight;
        this.visibleStart = 0;
        this.visibleEnd = 0;

        this.init();
    }

    init() {
        const viewportHeight = this.container.clientHeight;
        this.visibleCount = Math.ceil(viewportHeight / this.rowHeight);

        this.container.addEventListener('scroll', () => {
            this.onScroll();
        });

        this.render();
    }

    onScroll() {
        const scrollTop = this.container.scrollTop;
        this.visibleStart = Math.floor(scrollTop / this.rowHeight);
        this.visibleEnd = this.visibleStart + this.visibleCount;
        this.render();
    }

    render() {
        const fragment = document.createDocumentFragment();
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
            if (this.items[i]) {
                fragment.appendChild(this.createRow(this.items[i]));
            }
        }
        this.container.innerHTML = '';
        this.container.appendChild(fragment);
    }
}
```

### 3. メモリ管理

**イベントリスナーのクリーンアップ:**
```javascript
class TaskList {
    constructor() {
        this.listeners = [];
    }

    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.listeners.push({ element, event, handler });
    }

    destroy() {
        this.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.listeners = [];
    }
}
```

---

## まとめ

### 開発スケジュール概算

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 0 | 1-2日 | 基盤整備 |
| Phase 1 | 3-5日 | コア機能 |
| Phase 2 | 3-4日 | ガントチャート |
| **MVP完成** | **約1-2週間** | **基本機能動作** |
| Phase 3 | 4-5日 | アジャイル機能 |
| Phase 4 | 2-3日 | データ連携 |
| Phase 5 | 5-7日 | チャート・レポート |
| Phase 6 | 3-4日 | 高度な機能 |
| **完全版** | **約3-4週間** | **全機能実装** |

### 次のアクション

1. ✅ プロジェクト構造・ドキュメント完成
2. ⬜ 残り13個のJavaScriptファイル実装
3. ⬜ MVP動作確認
4. ⬜ フィードバック収集
5. ⬜ 機能拡張

**推奨アプローチ:**
- MVP優先（Phase 0-2）
- 早期フィードバック
- 段階的機能追加
