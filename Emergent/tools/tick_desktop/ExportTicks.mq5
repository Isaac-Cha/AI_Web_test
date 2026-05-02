//+------------------------------------------------------------------+
//|                                                  ExportTicks.mq5 |
//|                                      Copyright 2026, Emergent EA |
//+------------------------------------------------------------------+
#property copyright "Emergent EA"
#property link      ""
#property version   "1.01"
#property script_show_inputs

input string   InpSymbol = "XAUUSD";      // 交易品种 (Symbol)
input datetime InpStartDate = D'2026.01.01 00:00:00'; // 开始日期 (Start Date)
input datetime InpEndDate = D'2026.04.28 00:00:00';   // 结束日期 (End Date)

//+------------------------------------------------------------------+
//| Script program start function                                    |
//+------------------------------------------------------------------+
void OnStart()
  {
   datetime current_day = InpStartDate;
   
   // 将起始日期对齐到当天的 00:00:00
   MqlDateTime dt;
   TimeToStruct(current_day, dt);
   dt.hour = 0;
   dt.min = 0;
   dt.sec = 0;
   current_day = StructToTime(dt);
   
   Print("开始按天导出 Tick 数据: ", InpSymbol, " 从 ", TimeToString(InpStartDate), " 到 ", TimeToString(InpEndDate));
   
   int total_days_exported = 0;
   long total_ticks_exported = 0;
   
   // 循环每一天
   while(current_day < InpEndDate)
     {
      datetime next_day = current_day + 86400; // 加一天 (86400秒)
      
      ulong from_msc = (ulong)current_day * 1000;
      ulong to_msc = (ulong)next_day * 1000 - 1; // 当天最后一毫秒
      
      if(next_day > InpEndDate)
        {
         to_msc = (ulong)InpEndDate * 1000;
        }
      
      MqlTick ticks[];
      // 获取当天的所有 Tick
      int copied = CopyTicksRange(InpSymbol, ticks, COPY_TICKS_ALL, from_msc, to_msc);
      
      if(copied > 0)
        {
         TimeToStruct(current_day, dt);
         
         // 构造文件名: 例如 xauusd_2026-01-01.csv
         string sym_lower = InpSymbol;
         StringToLower(sym_lower);
         string file_name = StringFormat("%s_%04d-%02d-%02d.csv", sym_lower, dt.year, dt.mon, dt.day);
         
         int file_handle = FileOpen(file_name, FILE_WRITE|FILE_CSV|FILE_ANSI, ",");
         if(file_handle != INVALID_HANDLE)
           {
            // 写入与分析工具兼容的表头
            FileWrite(file_handle, "ts", "bid", "ask", "volume");
            
            for(int i = 0; i < copied; i++)
              {
               datetime time = (datetime)(ticks[i].time_msc / 1000);
               int ms = (int)(ticks[i].time_msc % 1000);
               
               MqlDateTime t_dt;
               TimeToStruct(time, t_dt);
               
               // 格式化时间戳为 ISO 8601
               string ts = StringFormat("%04d-%02d-%02dT%02d:%02d:%02d.%03dZ", 
                                        t_dt.year, t_dt.mon, t_dt.day, 
                                        t_dt.hour, t_dt.min, t_dt.sec, ms);
                                        
               FileWrite(file_handle, ts, ticks[i].bid, ticks[i].ask, (double)ticks[i].volume);
              }
              
            FileClose(file_handle);
            Print("已导出: ", file_name, " (", copied, " ticks)");
            
            total_days_exported++;
            total_ticks_exported += copied;
           }
         else
           {
            Print("无法创建文件: ", file_name, " 错误码: ", GetLastError());
           }
        }
      else
        {
         // 当日无数据，例如周末
         Print(TimeToString(current_day, TIME_DATE), " 无数据，跳过。");
        }
      
      current_day = next_day;
     }
     
   Print("=========================================");
   Print("导出任务完成！");
   Print("共生成 ", total_days_exported, " 个每日文件。");
   Print("累计导出 ", total_ticks_exported, " 条 Tick 数据。");
   Print("请在 MT5 的 MQL5/Files/ 目录下查看。");
   Print("=========================================");
  }
//+------------------------------------------------------------------+