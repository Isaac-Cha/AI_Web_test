//+------------------------------------------------------------------+
//|                                              HistoryExporter.mq4 |
//|                                  Copyright 2026, Emergent        |
//|                                                                  |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Emergent"
#property link      ""
#property version   "1.00"
#property strict
#property script_show_inputs

// Input parameters for manual entry
input string InpAccountPassword = ""; // Account Password (Read-Only or Investor)
input string InpServerName = "";      // Server Name

//+------------------------------------------------------------------+
//| Script program start function                                    |
//+------------------------------------------------------------------+
void OnStart()
  {
   // IMPORTANT: Ensure the "Account History" tab in the terminal is set to "All History"
   string account_num = IntegerToString(AccountNumber());
   string file_name = "History_" + account_num + "_" + TimeToString(TimeCurrent(), TIME_DATE|TIME_MINUTES) + ".csv";
   StringReplace(file_name, ":", "");
   StringReplace(file_name, ".", "");
   StringReplace(file_name, " ", "_");
   
   int file_handle = FileOpen(file_name, FILE_WRITE|FILE_CSV|FILE_ANSI, ",");
   if(file_handle == INVALID_HANDLE)
     {
      Print("Failed to open file for writing, error ", GetLastError());
      MessageBox("Failed to open file for writing. Error: " + IntegerToString(GetLastError()), "Export Error");
      return;
     }
     
   // Write Header
   FileWrite(file_handle, "Account", "Password", "Server", "Ticket", "OpenTime", "Type", "Lots", "Symbol", "OpenPrice", "CloseTime", "ClosePrice", "Commission", "Swap", "Profit", "Comment");
   
   int history_total = OrdersHistoryTotal();
   int exported_count = 0;
   
   for(int i = 0; i < history_total; i++)
     {
      if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
        {
         string type_str = "";
         int type = OrderType();
         if(type == OP_BUY) type_str = "Buy";
         else if(type == OP_SELL) type_str = "Sell";
         else if(type == 6) type_str = "Balance"; // Deposit/Withdrawal
         else if(type == 7) type_str = "Credit";
         else type_str = IntegerToString(type);
         
         FileWrite(file_handle,
                   account_num,
                   InpAccountPassword,
                   InpServerName,
                   IntegerToString(OrderTicket()),
                   TimeToString(OrderOpenTime(), TIME_DATE|TIME_SECONDS),
                   type_str,
                   DoubleToString(OrderLots(), 2),
                   OrderSymbol(),
                   DoubleToString(OrderOpenPrice(), 5),
                   TimeToString(OrderCloseTime(), TIME_DATE|TIME_SECONDS),
                   DoubleToString(OrderClosePrice(), 5),
                   DoubleToString(OrderCommission(), 2),
                   DoubleToString(OrderSwap(), 2),
                   DoubleToString(OrderProfit(), 2),
                   OrderComment()
                   );
         exported_count++;
        }
     }
     
   FileClose(file_handle);
   Print("History exported successfully to MQL4\\Files\\" + file_name);
   MessageBox("History exported successfully!\n\nExported " + IntegerToString(exported_count) + " records to:\nMQL4\\Files\\" + file_name + "\n\nIf the number of records is too small, make sure you right-clicked 'Account History' tab and selected 'All History'.", "Export Success");
  }
//+------------------------------------------------------------------+
