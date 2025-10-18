/**
 * Help Manager
 * ヘルプモーダルとウェルカムモーダルを管理
 */

const HelpManager = {
  currentTab: 'quickstart',

  init() {
    this.setupEventListeners();
    this.checkFirstVisit();
    this.loadContent();
  },

  setupEventListeners() {
    // ヘルプボタン
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this.openHelpModal());
    }

    // ヘルプモーダルの閉じるボタン
    const helpCloseBtn = document.getElementById('help-close-btn');
    if (helpCloseBtn) {
      helpCloseBtn.addEventListener('click', () => this.closeHelpModal());
    }

    // ウェルカムモーダルの閉じるボタン
    const welcomeCloseBtn = document.getElementById('welcome-close-btn');
    if (welcomeCloseBtn) {
      welcomeCloseBtn.addEventListener('click', () => this.closeWelcomeModal());
    }

    // ウェルカムモーダルの「始める」ボタン
    const welcomeStartBtn = document.getElementById('welcome-start-btn');
    if (welcomeStartBtn) {
      welcomeStartBtn.addEventListener('click', () => {
        this.closeWelcomeModal();
        this.openHelpModal();
      });
    }

    // タブボタン
    const tabButtons = document.querySelectorAll('.help-tab');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    // モーダル外クリックで閉じる
    const helpModal = document.getElementById('help-modal');
    const welcomeModal = document.getElementById('welcome-modal');

    if (helpModal) {
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
          this.closeHelpModal();
        }
      });
    }

    if (welcomeModal) {
      welcomeModal.addEventListener('click', (e) => {
        if (e.target === welcomeModal) {
          this.closeWelcomeModal();
        }
      });
    }
  },

  /**
   * 初回訪問チェック
   */
  checkFirstVisit() {
    const hasVisited = localStorage.getItem('wbs-tool-visited');
    if (!hasVisited) {
      setTimeout(() => {
        this.openWelcomeModal();
      }, 500);
      localStorage.setItem('wbs-tool-visited', 'true');
    }
  },

  /**
   * ウェルカムモーダルを開く
   */
  openWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  /**
   * ウェルカムモーダルを閉じる
   */
  closeWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /**
   * ヘルプモーダルを開く
   */
  openHelpModal() {
    const modal = document.getElementById('help-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  /**
   * ヘルプモーダルを閉じる
   */
  closeHelpModal() {
    const modal = document.getElementById('help-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /**
   * タブを切り替え
   */
  switchTab(tabName) {
    // タブボタンの切り替え
    const tabButtons = document.querySelectorAll('.help-tab');
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // タブコンテンツの切り替え
    const tabContents = document.querySelectorAll('.help-tab-content');
    tabContents.forEach(content => {
      if (content.dataset.tab === tabName) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    this.currentTab = tabName;
  },

  /**
   * すべてのコンテンツを読み込み
   */
  loadContent() {
    this.loadQuickstartContent();
    this.loadGuideContent();
    this.loadShortcutsContent();
  },

  /**
   * クイックスタートコンテンツを読み込み
   */
  loadQuickstartContent() {
    const container = document.getElementById('quickstart-content');
    if (!container) return;

    const html = `<div class="help-intro">
<h3>🚀 5ステップで始めるWBS Tool</h3>
<p>プロジェクト管理を今すぐ開始しましょう！</p>
</div>

      <div class="help-step">
        <div class="help-step-number">1</div>
        <div class="help-step-content">
          <h4>プロジェクトを作成</h4>
          <p>ヘッダーの <strong>「+」ボタン</strong> をクリックして新しいプロジェクトを作成します。</p>
        </div>
      </div>

      <div class="help-step">
        <div class="help-step-number">2</div>
        <div class="help-step-content">
          <h4>メンバーを登録</h4>
          <p>バックログビューの <strong>「メンバー管理」</strong> からチームメンバーを追加します。</p>
        </div>
      </div>

      <div class="help-step">
        <div class="help-step-number">3</div>
        <div class="help-step-content">
          <h4>タスクを作成</h4>
          <p><strong>「📝 新規タスク」</strong> ボタンでタスクを追加し、担当者や期日を設定します。</p>
        </div>
      </div>

      <div class="help-step">
        <div class="help-step-number">4</div>
        <div class="help-step-content">
          <h4>ビューを切り替え</h4>
          <p>ガントチャート、カンバン、バックログなど、目的に応じたビューを使い分けます。</p>
        </div>
      </div>

      <div class="help-step">
        <div class="help-step-number">5</div>
        <div class="help-step-content">
          <h4>データをバックアップ</h4>
          <p><strong>「📤 エクスポート」</strong> ボタンで定期的にデータをバックアップしましょう。</p>
        </div>
      </div>
    `.trim();

    container.innerHTML = html;
  },

  /**
   * 使い方ガイドコンテンツを読み込み
   */
  loadGuideContent() {
    const container = document.getElementById('guide-content');
    if (!container) return;

    const html = `
      <div class="help-intro">
        <h3>📖 WBS Tool 使い方ガイド</h3>
        <p>各機能の詳細な説明と活用方法を紹介します。</p>
      </div>

      <div class="help-section">
        <h4>📊 ガントチャート</h4>
        <p>タスクのタイムラインを可視化し、プロジェクト全体の進行状況を把握できます。</p>

        <h5>✨ 主な機能</h5>
        <ul>
          <li><strong>タスクバー表示</strong>: 各タスクの開始日から終了日までを横棒グラフで表示</li>
          <li><strong>ドラッグ&ドロップ編集</strong>: バーを左右にドラッグして開始日・終了日を直感的に変更</li>
          <li><strong>ステータス色分け</strong>: Todo（グレー）、進行中（青）、レビュー（オレンジ）、完了（緑）で一目で判別</li>
          <li><strong>今日の線</strong>: 赤い縦線で現在日を表示し、進捗状況を把握</li>
          <li><strong>依存関係表示</strong>: タスク間の依存関係を矢印で可視化（今後実装予定）</li>
        </ul>

        <h5>💡 使い方のコツ</h5>
        <ul>
          <li>週次・月次でビューを切り替えて、適切な粒度で計画を立てましょう</li>
          <li>クリティカルパス（最長工程）を常に意識して遅延リスクを管理</li>
          <li>色の変化で進捗を可視化し、チーム全体で状況を共有</li>
        </ul>
      </div>

      <div class="help-section">
        <h4>📋 カンバンボード</h4>
        <p>タスクをステータス別に整理し、アジャイルなワークフローを実現します。</p>

        <h5>✨ 主な機能</h5>
        <ul>
          <li><strong>4つのステータス列</strong>: Todo（未着手）、進行中、レビュー、完了の流れで管理</li>
          <li><strong>直感的なドラッグ操作</strong>: カードを別の列にドロップするだけでステータス変更</li>
          <li><strong>カード詳細表示</strong>: タスク名、担当者、ストーリーポイント、期日を一覧表示</li>
          <li><strong>WIP制限</strong>: 進行中タスクの上限設定で作業の集中化（今後実装予定）</li>
          <li><strong>優先度順ソート</strong>: カード内でドラッグして優先度を調整</li>
        </ul>

        <h5>💡 使い方のコツ</h5>
        <ul>
          <li>毎日のスタンドアップミーティングでカンバンを確認し、ボトルネックを早期発見</li>
          <li>進行中の列にタスクを溜めすぎない（1人2-3タスク程度が理想）</li>
          <li>レビュー列でコードレビューやQAの待ち状態を可視化</li>
        </ul>
      </div>

      <div class="help-section">
        <h4>📑 バックログ</h4>
        <p>タスク一覧の管理とスプリント計画を効率的に行います。</p>

        <h5>✨ 主な機能</h5>
        <ul>
          <li><strong>タスク一覧表示</strong>: すべてのタスクを表形式で一覧表示、検索・フィルタリングが可能</li>
          <li><strong>スプリント管理</strong>: 1-4週間のスプリントを作成し、タスクを計画的に割り当て</li>
          <li><strong>メンバー管理</strong>: チームメンバーの追加・編集・削除が可能</li>
          <li><strong>一括編集</strong>: 複数タスクを選択して担当者やステータスを一括変更</li>
          <li><strong>ストーリーポイント集計</strong>: スプリントごとの総ポイント数を自動計算</li>
        </ul>

        <h5>💡 使い方のコツ</h5>
        <ul>
          <li>スプリント計画会議で、チームの平均ベロシティを考慮してタスクを割り当て</li>
          <li>プロダクトバックログは常に優先度順に並べ替え、上から順に着手</li>
          <li>大きなタスクは小さく分割して、1タスク1-3日で完了する粒度に</li>
        </ul>
      </div>

      <div class="help-section">
        <h4>📈 ダッシュボード</h4>
        <p>プロジェクトの健全性を多角的に分析し、データドリブンな意思決定を支援します。</p>

        <h5>✨ 主な機能</h5>
        <ul>
          <li><strong>KPIカード</strong>: 総タスク数、完了率、平均ベロシティを大きく表示</li>
          <li><strong>バーンダウンチャート</strong>: 理想線と実績線を比較してスプリントの進捗を追跡</li>
          <li><strong>ステータス分布グラフ</strong>: ドーナツチャートでタスクのステータス別分布を可視化</li>
          <li><strong>担当者別負荷グラフ</strong>: メンバーごとのタスク数・ポイント数を比較</li>
          <li><strong>期限切れアラート</strong>: 期日超過タスクを赤色でハイライト表示</li>
        </ul>

        <h5>💡 使い方のコツ</h5>
        <ul>
          <li>毎週のレトロスペクティブでダッシュボードを確認し、改善点を議論</li>
          <li>バーンダウンチャートが理想線より上にある場合は、スコープ調整を検討</li>
          <li>担当者別負荷が偏っている場合は、タスクの再配分を実施</li>
        </ul>
      </div>

      <div class="help-section">
        <h4>📄 レポート機能</h4>
        <p>プロジェクトの分析レポートを自動生成し、ステークホルダーへの報告を効率化します。</p>

        <h5>✨ 主な機能</h5>
        <ul>
          <li><strong>プロジェクトサマリー</strong>: 全体概要、期間、完了率、主要メトリクスを集約</li>
          <li><strong>タスク詳細リスト</strong>: すべてのタスクを表形式で出力、ステータスごとにグルーピング</li>
          <li><strong>チャート埋め込み</strong>: ダッシュボードのグラフをそのままPDFに出力</li>
          <li><strong>PDF生成</strong>: 「レポート生成」ボタンで美しいレイアウトのPDFを自動作成</li>
          <li><strong>カスタマイズ</strong>: 含める項目を選択して、必要な情報だけをレポート化</li>
        </ul>

        <h5>💡 使い方のコツ</h5>
        <ul>
          <li>週次レポートを定期的に生成し、プロジェクトの進捗を記録</li>
          <li>スプリント終了時にレトロスペクティブ資料として活用</li>
          <li>経営層への報告資料として、サマリーとチャートを抜粋</li>
        </ul>
      </div>

      <div class="help-section">
        <h4>💾 データ管理</h4>
        <p>大切なプロジェクトデータを安全に保管し、いつでも復元できます。</p>

        <h5>✨ 主な機能</h5>
        <ul>
          <li><strong>JSONエクスポート</strong>: すべてのプロジェクトデータを標準フォーマットで保存</li>
          <li><strong>JSONインポート</strong>: 以前のデータファイルを読み込んで完全復元</li>
          <li><strong>LocalStorage自動保存</strong>: ブラウザに自動的にデータを保存（データ紛失を防止）</li>
          <li><strong>複数プロジェクト対応</strong>: プロジェクトごとに個別のファイルで管理可能</li>
          <li><strong>バージョン管理</strong>: エクスポート時にタイムスタンプ付きファイル名で世代管理</li>
        </ul>

        <h5>💡 使い方のコツ</h5>
        <ul>
          <li>重要なマイルストーン達成時には必ずエクスポートしてバックアップ</li>
          <li>週次で定期バックアップを取得し、Googleドライブなどクラウドに保管</li>
          <li>異なるブラウザ間でデータを移行する際にも活用可能</li>
          <li>チームメンバー間でJSONファイルを共有して、プロジェクトデータを同期</li>
        </ul>
      </div>

      <div class="help-section">
        <h4>⚙️ 設定とカスタマイズ</h4>
        <p>WBS Toolを自分好みにカスタマイズして、より快適に使いましょう。</p>

        <h5>✨ 主な機能</h5>
        <ul>
          <li><strong>テーマ設定</strong>: ライトモード/ダークモードの切り替え</li>
          <li><strong>言語設定</strong>: 日本語/英語の表示言語切り替え（今後実装予定）</li>
          <li><strong>通知設定</strong>: 期日リマインダーやステータス変更通知のON/OFF</li>
          <li><strong>表示設定</strong>: デフォルトビュー、週の開始曜日、日付フォーマットなど</li>
          <li><strong>データ管理</strong>: ストレージ使用量の確認と全データクリア</li>
        </ul>
      </div>

      <div class="help-section">
        <h4>❓ よくある質問（FAQ）</h4>

        <h5>Q: データはどこに保存されますか？</h5>
        <p>A: ブラウザのLocalStorageに保存されます。端末とブラウザごとに独立したデータです。</p>

        <h5>Q: 複数のプロジェクトを管理できますか？</h5>
        <p>A: はい。プロジェクト切り替え機能で複数のプロジェクトを管理できます。</p>

        <h5>Q: チームで共同編集できますか？</h5>
        <p>A: 現在はローカル保存のみですが、JSONファイルのエクスポート/インポートで共有可能です。リアルタイム共同編集は今後の機能追加を検討中です。</p>

        <h5>Q: データが消えることはありますか？</h5>
        <p>A: LocalStorageは永続的ですが、ブラウザのキャッシュクリアで削除される可能性があります。定期的にエクスポートしてバックアップすることを強く推奨します。</p>

        <h5>Q: モバイル端末でも使えますか？</h5>
        <p>A: はい。レスポンシブデザインでスマートフォンやタブレットでも操作可能です。</p>
      </div>
    `.trim();

    container.innerHTML = html;
  },

  /**
   * ショートカットコンテンツを読み込み
   */
  loadShortcutsContent() {
    const container = document.getElementById('shortcuts-content');
    if (!container) return;

    const html = `
      <div class="help-intro">
        <h3>⌨️ キーボードショートカット</h3>
        <p>効率的な操作のためのショートカット一覧です。</p>
      </div>

      <div class="help-note">
        <p>⚠️ キーボードショートカット機能は今後のアップデートで追加予定です。</p>
      </div>

      <div class="help-section">
        <h4>予定されているショートカット</h4>
        <ul>
          <li><strong>Ctrl/Cmd + N</strong>: 新規タスク作成</li>
          <li><strong>Ctrl/Cmd + S</strong>: 保存</li>
          <li><strong>Ctrl/Cmd + E</strong>: エクスポート</li>
          <li><strong>Ctrl/Cmd + ,</strong>: 設定を開く</li>
          <li><strong>?</strong>: ヘルプを表示</li>
        </ul>
      </div>
    `.trim();

    container.innerHTML = html;
  }
};

// ページ読み込み時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => HelpManager.init());
} else {
  HelpManager.init();
}
