import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import csv
import os
import json
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from pathlib import Path
import threading
import requests
import uuid

DB_PATH = Path(__file__).parent / "analyzer.db"

class Database:
    def __init__(self, path: Path):
        self.conn = sqlite3.connect(path)
        self._create_tables()

    def _create_tables(self):
        c = self.conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                ea_id TEXT,
                account TEXT,
                server TEXT,
                platform TEXT DEFAULT 'MT4',
                currency TEXT,
                initial_deposit REAL,
                total_profit REAL,
                win_rate REAL,
                min_lots REAL,
                max_lots REAL,
                holding_min TEXT,
                holding_avg TEXT,
                holding_max TEXT,
                max_drawdown REAL,
                profit_by_day TEXT,
                profit_by_week TEXT,
                profit_by_month TEXT,
                last_updated TEXT
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                ticket TEXT PRIMARY KEY,
                account TEXT,
                server TEXT,
                type TEXT,
                lots REAL,
                symbol TEXT,
                open_price REAL,
                close_price REAL,
                open_time TEXT,
                close_time TEXT,
                commission REAL,
                swap REAL,
                profit REAL,
                comment TEXT
            )
        """)
        self.conn.commit()

    def save_trades(self, df: pd.DataFrame):
        c = self.conn.cursor()
        for _, row in df.iterrows():
            c.execute("""
                INSERT OR REPLACE INTO trades (
                    ticket, account, server, type, lots, symbol, open_price, close_price,
                    open_time, close_time, commission, swap, profit, comment
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(row.get('Ticket', '')), str(row.get('Account', '')), str(row.get('Server', '')),
                str(row.get('Type', '')), float(row.get('Lots', 0)), str(row.get('Symbol', '')),
                float(row.get('OpenPrice', 0)), float(row.get('ClosePrice', 0)) if pd.notna(row.get('ClosePrice')) else None,
                str(row.get('OpenTime', '')), str(row.get('CloseTime', '')) if pd.notna(row.get('CloseTime')) else None,
                float(row.get('Commission', 0)), float(row.get('Swap', 0)), float(row.get('Profit', 0)),
                str(row.get('Comment', ''))
            ))
        self.conn.commit()

    def get_trades(self, account: str) -> pd.DataFrame:
        query = f"SELECT * FROM trades WHERE account='{account}'"
        return pd.read_sql_query(query, self.conn)

    def save_account(self, data: dict):
        c = self.conn.cursor()
        # Add column if not exists for backwards compatibility
        try:
            c.execute("ALTER TABLE accounts ADD COLUMN ea_id TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            c.execute("ALTER TABLE accounts ADD COLUMN platform TEXT DEFAULT 'MT4'")
        except sqlite3.OperationalError:
            pass
            
        c.execute("""
            INSERT OR REPLACE INTO accounts (
                id, ea_id, account, server, platform, currency, initial_deposit, total_profit, win_rate,
                min_lots, max_lots, holding_min, holding_avg, holding_max, max_drawdown,
                profit_by_day, profit_by_week, profit_by_month, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['id'], data.get('ea_id', ''), data['account'], data['server'], data.get('platform', 'MT4'), data['currency'],
            data['initial_deposit'], data['total_profit'], data['win_rate'],
            data['min_lots'], data['max_lots'], data['holding_min'],
            data['holding_avg'], data['holding_max'], data['max_drawdown'],
            json.dumps(data['profit_by_day']), json.dumps(data['profit_by_week']),
            json.dumps(data['profit_by_month']), data['last_updated']
        ))
        self.conn.commit()

    def get_all_accounts(self):
        c = self.conn.cursor()
        c.execute("SELECT * FROM accounts")
        cols = [description[0] for description in c.description]
        return [dict(zip(cols, row)) for row in c.fetchall()]

    def update_account_ea_id(self, account_id: str, ea_id: str):
        c = self.conn.cursor()
        c.execute("UPDATE accounts SET ea_id=? WHERE id=?", (ea_id, account_id))
        self.conn.commit()

db = Database(DB_PATH)

class AccountAnalyzerGUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Emergent 交易账号分析工具")
        self.geometry("900x700")
        self.current_trades_df = None
        self.current_analysis = None

        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        self._build_import_tab()
        self._build_analysis_tab()
        self._build_history_tab()
        self._build_publish_tab()

    def _build_import_tab(self):
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="1. 导入数据")

        # MT4 Data
        lf_mt4 = ttk.LabelFrame(frame, text="MT4 历史数据导入", padding=10)
        lf_mt4.pack(fill=tk.X, padx=10, pady=10)

        self.mt4_path_var = tk.StringVar()
        ttk.Entry(lf_mt4, textvariable=self.mt4_path_var, width=60).pack(side=tk.LEFT, padx=5)
        ttk.Button(lf_mt4, text="选择CSV", command=self._select_mt4_csv).pack(side=tk.LEFT, padx=5)
        
        self.platform_var = tk.StringVar(value="MT4")
        cb_platform = ttk.Combobox(lf_mt4, textvariable=self.platform_var, values=["MT4", "MT5"], state="readonly", width=8)
        cb_platform.pack(side=tk.LEFT, padx=5)
        
        ttk.Button(lf_mt4, text="加载", command=self._load_mt4_data).pack(side=tk.LEFT, padx=5)

        self.mt4_info_label = ttk.Label(lf_mt4, text="尚未加载数据")
        self.mt4_info_label.pack(side=tk.LEFT, padx=20)

        # Tick Data
        lf_tick = ttk.LabelFrame(frame, text="Tick 数据目录 (用于回撤计算)", padding=10)
        lf_tick.pack(fill=tk.X, padx=10, pady=10)
        
        self.tick_dir_var = tk.StringVar(value=str(Path(__file__).parent / "download" / "xauusd"))
        ttk.Entry(lf_tick, textvariable=self.tick_dir_var, width=60).pack(side=tk.LEFT, padx=5)
        ttk.Button(lf_tick, text="选择目录", command=self._select_tick_dir).pack(side=tk.LEFT, padx=5)

    def _select_mt4_csv(self):
        path = filedialog.askopenfilename(filetypes=[("CSV files", "*.csv")])
        if path:
            self.mt4_path_var.set(path)

    def _select_tick_dir(self):
        path = filedialog.askdirectory()
        if path:
            self.tick_dir_var.set(path)

    def _load_mt4_data(self):
        path = self.mt4_path_var.get()
        if not path or not os.path.exists(path):
            messagebox.showerror("错误", "请先选择有效的MT4 CSV文件")
            return
        try:
            df = pd.read_csv(path)
            # Parse dates
            df['OpenTime'] = pd.to_datetime(df['OpenTime'].str.replace('.', '-'))
            df['CloseTime'] = pd.to_datetime(df['CloseTime'].str.replace('.', '-'), errors='coerce')
            
            # Filter valid trades
            trades = df[df['Type'].isin(['Buy', 'Sell'])]
            deposits = df[(df['Type'] == 'Balance') & (df['Profit'] > 0)]
            
            acc = str(df.iloc[0]['Account']) if not df.empty else "Unknown"
            
            # Save incrementally to DB
            db.save_trades(df)
            
            # Read full history from DB for this account
            full_df = db.get_trades(acc)
            
            # Map DB columns back to expected names if necessary
            full_df = full_df.rename(columns={
                'ticket': 'Ticket', 'account': 'Account', 'server': 'Server',
                'type': 'Type', 'lots': 'Lots', 'symbol': 'Symbol',
                'open_price': 'OpenPrice', 'close_price': 'ClosePrice',
                'open_time': 'OpenTime', 'close_time': 'CloseTime',
                'commission': 'Commission', 'swap': 'Swap', 'profit': 'Profit',
                'comment': 'Comment'
            })
            full_df['OpenTime'] = pd.to_datetime(full_df['OpenTime'])
            full_df['CloseTime'] = pd.to_datetime(full_df['CloseTime'])
            
            trades = full_df[full_df['Type'].isin(['Buy', 'Sell'])]
            deposits = full_df[(full_df['Type'] == 'Balance') & (full_df['Profit'] > 0)]
            
            self.mt4_info_label.config(text=f"账号: {acc} | 历史总交易单: {len(trades)} | 入金: {len(deposits)}笔")
            self.current_trades_df = full_df
            messagebox.showinfo("成功", f"增量数据导入成功！\n数据库中该账号当前共 {len(full_df)} 条记录。\n请前往「2. 账号分析」进行运算。")
        except Exception as e:
            messagebox.showerror("解析错误", f"读取 MT4 CSV 失败: {e}")

    def _build_analysis_tab(self):
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="2. 账号分析")

        btn_frame = ttk.Frame(frame)
        btn_frame.pack(fill=tk.X, padx=10, pady=10)
        ttk.Button(btn_frame, text="开始深度分析与回撤计算", command=self._start_analysis).pack(side=tk.LEFT)

        self.analysis_text = tk.Text(frame, wrap=tk.WORD, height=25)
        self.analysis_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

    def _start_analysis(self):
        if self.current_trades_df is None:
            messagebox.showerror("错误", "请先在第1步加载MT4数据！")
            return
        
        tick_dir = Path(self.tick_dir_var.get())
        if not tick_dir.exists():
            messagebox.showwarning("警告", "Tick 数据目录不存在，将跳过精确回撤计算，仅计算基础数据。")
            
        self.analysis_text.insert(tk.END, "开始计算基础指标...\n")
        threading.Thread(target=self._run_analysis_worker, args=(tick_dir,), daemon=True).start()

    def _run_analysis_worker(self, tick_dir: Path):
        try:
            df = self.current_trades_df.copy()
            trades = df[df['Type'].isin(['Buy', 'Sell'])].copy()
            balance_tx = df[df['Type'] == 'Balance'].copy()

            initial_deposit = balance_tx['Profit'].sum() if not balance_tx.empty else 0.0
            
            trades['NetProfit'] = trades['Profit'] + trades['Commission'] + trades['Swap']
            total_profit = trades['NetProfit'].sum()
            
            win_trades = trades[trades['NetProfit'] > 0]
            win_rate = len(win_trades) / len(trades) if len(trades) > 0 else 0

            min_lots = trades['Lots'].min() if not trades.empty else 0
            max_lots = trades['Lots'].max() if not trades.empty else 0

            trades['Duration'] = trades['CloseTime'] - trades['OpenTime']
            min_duration = trades['Duration'].min()
            avg_duration = trades['Duration'].mean()
            max_duration = trades['Duration'].max()

            # Time-based grouping
            trades['CloseDate'] = trades['CloseTime'].dt.date
            trades['CloseWeek'] = trades['CloseTime'].dt.to_period('W').apply(lambda r: r.start_time.strftime('%Y-%m-%d'))
            trades['CloseMonth'] = trades['CloseTime'].dt.to_period('M').apply(lambda r: r.strftime('%Y-%m'))

            profit_by_day = trades.groupby('CloseDate')['NetProfit'].sum().to_dict()
            profit_by_week = trades.groupby('CloseWeek')['NetProfit'].sum().to_dict()
            profit_by_month = trades.groupby('CloseMonth')['NetProfit'].sum().to_dict()
            profit_by_day_str = {str(k): v for k, v in profit_by_day.items()}

            self._log_analysis(f"初始入金: {initial_deposit:.2f}")
            self._log_analysis(f"总净利润: {total_profit:.2f}")
            self._log_analysis(f"胜率: {win_rate*100:.2f}%")
            self._log_analysis(f"开仓手数: {min_lots} - {max_lots}")
            self._log_analysis(f"持仓时间: 最短 {min_duration}, 平均 {avg_duration}, 最长 {max_duration}")

            # Tick-based drawdown (Simplified logic: we just scan trade times)
            max_drawdown = 0.0
            if tick_dir.exists() and not trades.empty:
                self._log_analysis("开始读取 Tick 数据进行精确浮亏回撤计算 (需要较长时间)...")
                # To avoid hanging the UI for hours, we will do a fast approximation:
                # Max Drawdown = Minimum equity drop during the whole period.
                # In a real heavy implementation, we merge tick times and trades.
                # Here we just put a placeholder for the heavy logic or run a simplified version.
                max_drawdown = self._calculate_drawdown_approx(df, tick_dir)
                self._log_analysis(f"精确最大回撤计算完成: {max_drawdown:.2f}%")
            else:
                self._log_analysis("跳过 Tick 数据回撤计算。")

            account_id = str(uuid.uuid4())
            # check if account already exists in DB
            existing_accs = db.get_all_accounts()
            for existing in existing_accs:
                if existing['account'] == account_num:
                    account_id = existing['id']
                    break

            self.current_analysis = {
                "id": account_id,
                "account": account_num,
                "server": server_name,
                "platform": self.platform_var.get(),
                "currency": "USD",
                "initial_deposit": float(initial_deposit),
                "total_profit": float(total_profit),
                "win_rate": float(win_rate),
                "min_lots": float(min_lots),
                "max_lots": float(max_lots),
                "holding_min": str(min_duration),
                "holding_avg": str(avg_duration),
                "holding_max": str(max_duration),
                "max_drawdown": float(max_drawdown),
                "profit_by_day": profit_by_day_str,
                "profit_by_week": profit_by_week,
                "profit_by_month": profit_by_month,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
            
            db.save_account(self.current_analysis)
            self._log_analysis("分析完成！已保存到本地数据库。您可以前往「3. 历史记录」查看或前往「4. 发布」上传到网站。")
            self._refresh_history()
            
        except Exception as e:
            self._log_analysis(f"分析出错: {e}")

    def _calculate_drawdown_approx(self, df, tick_dir: Path):
        trades = df[df['Type'].isin(['Buy', 'Sell'])].copy()
        if trades.empty: return 0.0

        # Infer multiplier (contract size) from profit and price diff
        def get_multiplier(row):
            if row['Type'] == 'Buy': diff = row['ClosePrice'] - row['OpenPrice']
            else: diff = row['OpenPrice'] - row['ClosePrice']
            if abs(diff) > 1e-5: return row['Profit'] / diff
            return row['Lots'] * 100 # Fallback for XAUUSD

        trades['Multiplier'] = trades.apply(get_multiplier, axis=1)
        trades['OpenTime_ms'] = pd.to_datetime(trades['OpenTime'], utc=True).astype('int64') // 10**6
        trades['CloseTime_ms'] = pd.to_datetime(trades['CloseTime'], utc=True).astype('int64') // 10**6

        min_time_ms = trades['OpenTime_ms'].min()
        max_time_ms = trades['CloseTime_ms'].max()

        balance_tx = df[df['Type'] == 'Balance'].copy()
        balance_tx['OpenTime_ms'] = pd.to_datetime(balance_tx['OpenTime'], utc=True).astype('int64') // 10**6
        
        # Build events list: 
        events = []
        for _, r in balance_tx.iterrows():
            events.append((r['OpenTime_ms'], r['Profit']))
        for _, r in trades.iterrows():
            net_profit = r['Profit'] + r['Commission'] + r['Swap']
            events.append((r['CloseTime_ms'], net_profit))
        
        events.sort(key=lambda x: x[0])
        events_arr = np.array(events) if len(events) > 0 else np.empty((0, 2))
        
        current_closed_balance = 0.0
        event_idx = 0
        max_equity = 0.0
        max_dd = 0.0
        
        # Convert trades to NumPy arrays for fast vectorized calculations
        trades_arr = trades[['OpenTime_ms', 'CloseTime_ms', 'Type', 'OpenPrice', 'Multiplier', 'Commission', 'Swap']].values
        # Column mapping: 0:Open_ms, 1:Close_ms, 2:Type, 3:OpenPrice, 4:Multiplier, 5:Commission, 6:Swap
        # Optimize Type: Buy=1, Sell=-1
        types_numeric = np.where(trades_arr[:, 2] == 'Buy', 1.0, -1.0)
        trades_numeric = np.zeros((trades_arr.shape[0], 7), dtype=np.float64)
        trades_numeric[:, 0] = trades_arr[:, 0] # Open
        trades_numeric[:, 1] = trades_arr[:, 1] # Close
        trades_numeric[:, 2] = types_numeric    # Type
        trades_numeric[:, 3] = trades_arr[:, 3] # OpenPrice
        trades_numeric[:, 4] = trades_arr[:, 4] # Multiplier
        trades_numeric[:, 5] = trades_arr[:, 5] # Commission
        trades_numeric[:, 6] = trades_arr[:, 6] # Swap
        
        current_date = pd.to_datetime(min_time_ms, unit='ms', utc=True).date()
        end_date = pd.to_datetime(max_time_ms, unit='ms', utc=True).date()
        
        while current_date <= end_date:
            day_str = current_date.strftime("%Y-%m-%d")
            csv_files = list(tick_dir.rglob(f"*_{day_str}*.csv"))
            if csv_files:
                try:
                    tick_df = pd.read_csv(csv_files[0])
                    ts_col = 'ts' if 'ts' in tick_df.columns else 'timestamp'
                    if ts_col not in tick_df.columns:
                        continue
                    
                    bid_col = 'bid' if 'bid' in tick_df.columns else 'bidPrice'
                    ask_col = 'ask' if 'ask' in tick_df.columns else 'askPrice'
                    
                    ticks_arr = tick_df[[ts_col, bid_col, ask_col]].values
                    # Vectorized processing chunk by chunk
                    chunk_size = 10000
                    for start_idx in range(0, len(ticks_arr), chunk_size):
                        chunk = ticks_arr[start_idx:start_idx+chunk_size]
                        ts = chunk[:, 0]
                        bid = chunk[:, 1]
                        ask = chunk[:, 2]
                        
                        # Process events for this chunk's time range
                        for i in range(len(ts)):
                            t_ms = ts[i]
                            while event_idx < len(events_arr) and events_arr[event_idx, 0] <= t_ms:
                                current_closed_balance += events_arr[event_idx, 1]
                                event_idx += 1
                                
                            # Find active trades
                            # A trade is active if Open <= t_ms < Close
                            active_mask = (trades_numeric[:, 0] <= t_ms) & (trades_numeric[:, 1] > t_ms)
                            
                            if np.any(active_mask):
                                active_trades = trades_numeric[active_mask]
                                is_buy = active_trades[:, 2] == 1.0
                                
                                # Vectorized float calc:
                                # Buy: (bid - open) * multiplier + comm + swap
                                # Sell: (open - ask) * multiplier + comm + swap
                                
                                float_buy = np.sum((bid[i] - active_trades[is_buy, 3]) * active_trades[is_buy, 4] + active_trades[is_buy, 5] + active_trades[is_buy, 6])
                                float_sell = np.sum((active_trades[~is_buy, 3] - ask[i]) * active_trades[~is_buy, 4] + active_trades[~is_buy, 5] + active_trades[~is_buy, 6])
                                
                                equity = current_closed_balance + float_buy + float_sell
                            else:
                                equity = current_closed_balance
                                
                            if equity > max_equity:
                                max_equity = equity
                                
                            if max_equity > 0:
                                dd = (max_equity - equity) / max_equity * 100
                                if dd > max_dd:
                                    max_dd = dd
                                    
                except Exception as e:
                    print(f"Error processing tick file {csv_files[0]}: {e}")
            
            current_date += pd.Timedelta(days=1)
            
        return max_dd

    def _log_analysis(self, msg: str):
        self.analysis_text.insert(tk.END, msg + "\n")
        self.analysis_text.see(tk.END)

    def _build_history_tab(self):
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="3. 历史分析记录")

        cols = ("ID", "EA_ID", "Account", "Server", "Profit", "WinRate", "Drawdown", "Updated")
        self.tree = ttk.Treeview(frame, columns=cols, show="headings")
        self.tree.heading("ID", text="ID")
        self.tree.column("ID", width=0, stretch=tk.NO) # hide ID
        self.tree.heading("EA_ID", text="关联EA ID")
        self.tree.column("EA_ID", width=100)
        self.tree.heading("Account", text="Account")
        self.tree.column("Account", width=120)
        self.tree.heading("Server", text="Server")
        self.tree.column("Server", width=120)
        self.tree.heading("Profit", text="Profit")
        self.tree.column("Profit", width=100)
        self.tree.heading("WinRate", text="WinRate")
        self.tree.column("WinRate", width=80)
        self.tree.heading("Drawdown", text="Drawdown")
        self.tree.column("Drawdown", width=100)
        self.tree.heading("Updated", text="Updated")
        self.tree.column("Updated", width=120)
        
        self.tree.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        btn_frame = ttk.Frame(frame)
        btn_frame.pack(pady=5)
        ttk.Button(btn_frame, text="刷新", command=self._refresh_history).pack(side=tk.LEFT, padx=5)
        
        self._refresh_history()

    def _refresh_history(self):
        for row in self.tree.get_children():
            self.tree.delete(row)
        accounts = db.get_all_accounts()
        for acc in accounts:
            self.tree.insert("", tk.END, values=(
                acc['id'], acc.get('ea_id', ''), acc['account'], acc['server'], f"{acc['total_profit']:.2f}",
                f"{acc['win_rate']*100:.1f}%", f"{acc['max_drawdown']:.2f}%",
                acc['last_updated'][:10]
            ))

    def _build_publish_tab(self):
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="4. 发布到网站")
        
        # Form fields mapping to EAIn
        form_frame = ttk.Frame(frame)
        form_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        fields = [
            ("Admin Token", "admin_token"),
            ("API URL", "api_url"),
            ("操作类型", "publish_mode"),
            ("要更新的 EA ID", "target_ea_id"),
            ("名称 (中)", "name_zh"),
            ("名称 (英)", "name_en"),
            ("交易品种", "symbol"),
            ("平台", "platform"),
            ("策略 (中)", "strategy_zh"),
            ("最低资金", "min_capital"),
            ("海报链接 (Cover)", "cover")
        ]
        
        self.pub_vars = {}
        for i, (label_text, key) in enumerate(fields):
            ttk.Label(form_frame, text=label_text).grid(row=i, column=0, sticky=tk.W, pady=5)
            var = tk.StringVar()
            if key == "api_url":
                var.set("http://127.0.0.1:8000/api")
            elif key == "symbol":
                var.set("XAUUSD")
            elif key == "publish_mode":
                var.set("create")
            self.pub_vars[key] = var
            
            if key == "publish_mode":
                cb = ttk.Combobox(form_frame, textvariable=var, values=["create", "update"], state="readonly", width=47)
                cb.grid(row=i, column=1, sticky=tk.W, pady=5)
            else:
                ttk.Entry(form_frame, textvariable=var, width=50).grid(row=i, column=1, sticky=tk.W, pady=5)

        ttk.Button(form_frame, text="发布/更新 当前分析账号到网站", command=self._publish_to_web).grid(row=len(fields), column=1, pady=20, sticky=tk.W)

    def _publish_to_web(self):
        if not self.current_analysis:
            messagebox.showerror("错误", "请先完成一次分析后再发布！")
            return
            
        base_url = self.pub_vars["api_url"].get().strip().rstrip("/")
        token = self.pub_vars["admin_token"].get().strip()
        mode = self.pub_vars["publish_mode"].get()
        target_id = self.pub_vars["target_ea_id"].get().strip()
        
        # Determine ea_id to save in local DB
        ea_id_to_save = target_id if mode == "update" and target_id else self.current_analysis["id"]
        
        # Add to local accounts array for payload
        current_acc_stats = {
            "account": self.current_analysis["account"],
            "server": self.current_analysis["server"],
            "platform": self.current_analysis.get("platform", "MT4"),
            "currency": "USD",
            "initial_deposit": self.current_analysis["initial_deposit"],
            "total_profit": self.current_analysis["total_profit"],
            "win_rate": self.current_analysis["win_rate"],
            "min_lots": self.current_analysis["min_lots"],
            "max_lots": self.current_analysis["max_lots"],
            "holding_time_min": self.current_analysis["holding_min"],
            "holding_time_avg": self.current_analysis["holding_avg"],
            "holding_time_max": self.current_analysis["holding_max"],
            "max_drawdown": self.current_analysis["max_drawdown"],
            "profit_percentage": profit_pct,
            "profit_by_day": self.current_analysis["profit_by_day"],
            "profit_by_week": self.current_analysis["profit_by_week"],
            "profit_by_month": self.current_analysis["profit_by_month"],
            "last_sync_time": datetime.now(timezone.utc).isoformat()
        }
        
        # Update local DB to associate this account with the EA
        db.update_account_ea_id(self.current_analysis["id"], ea_id_to_save)
        self.current_analysis["ea_id"] = ea_id_to_save
        self._refresh_history()

        payload = {
            "id": ea_id_to_save,
            "sort": 1000,
            "status": "published",
            "name_zh": self.pub_vars["name_zh"].get(),
            "name_en": self.pub_vars["name_en"].get() or self.pub_vars["name_zh"].get(),
            "symbol": self.pub_vars["symbol"].get(),
            "platform": self.pub_vars["platform"].get() or "MT4",
            "profit_monthly": f"{self.current_analysis['total_profit']:.2f}",
            "max_drawdown": f"{self.current_analysis['max_drawdown']:.2f}%",
            "risk_level": "Medium",
            "strategy_zh": self.pub_vars["strategy_zh"].get(),
            "strategy_en": self.pub_vars["strategy_zh"].get(),
            "min_capital": self.pub_vars["min_capital"].get() or str(self.current_analysis['initial_deposit']),
            "cooperation_zh": "分成模式",
            "cooperation_en": "Profit Share",
            "cover": self.pub_vars["cover"].get(),
            # Advanced fields
            "profit_percentage": f"{profit_pct:.2f}%",
            "win_rate": f"{self.current_analysis['win_rate']*100:.2f}%",
            "min_lots": self.current_analysis['min_lots'],
            "max_lots": self.current_analysis['max_lots'],
            "holding_time_min": self.current_analysis['holding_min'],
            "holding_time_avg": self.current_analysis['holding_avg'],
            "holding_time_max": self.current_analysis['holding_max'],
            "profit_by_day": self.current_analysis['profit_by_day'],
            "profit_by_week": self.current_analysis['profit_by_week'],
            "profit_by_month": self.current_analysis['profit_by_month'],
            "last_sync_time": datetime.now(timezone.utc).isoformat(),
            "accounts": [current_acc_stats]
        }
        
        try:
            headers = {"x-admin-token": token} if token else {}
            if mode == "create":
                url = f"{base_url}/admin/eas"
                resp = requests.post(url, json=payload, headers=headers)
            else:
                if not target_id:
                    messagebox.showerror("错误", "更新模式下必须填写目标 EA ID")
                    return
                # Get existing EA first to merge accounts
                try:
                    get_resp = requests.get(f"{base_url}/eas/{target_id}")
                    if get_resp.status_code == 200:
                        existing_ea = get_resp.json()
                        existing_accounts = existing_ea.get('accounts', [])
                        # remove the current account if it exists, to replace it
                        existing_accounts = [a for a in existing_accounts if a['account'] != current_acc_stats['account']]
                        existing_accounts.append(current_acc_stats)
                        payload['accounts'] = existing_accounts
                except Exception as e:
                    print(f"Failed to fetch existing EA for accounts merge: {e}")
                    
                url = f"{base_url}/admin/eas/{target_id}"
                resp = requests.put(url, json=payload, headers=headers)
                
            resp.raise_for_status()
            messagebox.showinfo("成功", f"已成功{'创建' if mode == 'create' else '更新'}到网站数据库！")
        except Exception as e:
            messagebox.showerror("上传失败", f"同步失败: {e}\nResponse: {getattr(e.response, 'text', '')}")


if __name__ == "__main__":
    app = AccountAnalyzerGUI()
    app.mainloop()
