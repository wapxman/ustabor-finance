"use client";
import { useState, useCallback, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import * as XLSX from "xlsx";

const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16","#f97316","#14b8a6"];

function parseNumber(val) {
  if (!val) return 0;
  var s = String(val).replace(/\s/g, "").replace(",", ".");
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function categorize(desc) {
  if (!desc) return "Прочее";
  var d = desc.toLowerCase();
  if (d.includes("payme") || d.includes("smartvista")) return "PAYME";
  if (d.includes("humo")) return "HUMO";
  if (d.includes("click")) return "CLICK";
  if (d.includes("uzcard")) return "UZCARD";
  if (d.includes("зарплат") || d.includes("зп ") || d.includes("ish haqi")) return "Зарплата";
  if (d.includes("аренд") || d.includes("ijara")) return "Аренда";
  if (d.includes("юрист") || d.includes("lawtax") || d.includes("адвокат")) return "Юр. услуги";
  if (d.includes("налог") || d.includes("soliq") || d.includes("ндс")) return "Налоги";
  if (d.includes("комисси") || d.includes("банкаро") || d.includes("абонент") || d.includes("погашение")) return "Банк. комиссии";
  if (d.includes("реклам") || d.includes("маркетинг") || d.includes("smm")) return "Маркетинг";
  if (d.includes("сервер") || d.includes("хостинг") || d.includes("домен")) return "IT/Серверы";
  if (d.includes("вод") || d.includes("электр") || d.includes("коммунал") || d.includes("газ")) return "Коммунальные";
  if (d.includes("транспорт") || d.includes("такси") || d.includes("бензин")) return "Транспорт";
  return "Прочее";
}

function parseStatement(wb) {
  var sheet = wb.Sheets[wb.SheetNames[0]];
  var raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  var headerRow = -1;
  for (var i = 0; i < Math.min(raw.length, 20); i++) {
    var rowCheck = raw[i].map(function(c) { return String(c).toLowerCase(); });
    if (rowCheck.some(function(c) { return c.includes("дата проводки") || c.includes("дата") && c.length < 20; })) {
      headerRow = i; break;
    }
  }
  if (headerRow === -1) headerRow = 10;
  var transactions = [];
  for (var ri = headerRow + 1; ri < raw.length; ri++) {
    var row = raw[ri];
    if (!row || row.length < 5) continue;
    var dateStr = "";
    var debit = 0, credit = 0, description = "";
    for (var j = 0; j < row.length; j++) {
      var val = String(row[j] || "");
      if (!dateStr && /^\d{2}\.\d{2}\.\d{4}$/.test(val.trim())) dateStr = val.trim();
    }
    if (!dateStr) continue;
    for (var j2 = 0; j2 < row.length; j2++) {
      var v = String(row[j2] || "");
      if (v.length > 30 && (v.toLowerCase().includes("оплата") || v.toLowerCase().includes("зачисление") || v.toLowerCase().includes("выручка") || v.toLowerCase().includes("погашение") || v.toLowerCase().includes("smartvista") || v.toLowerCase().includes("humo") || v.toLowerCase().includes("click") || v.includes("00634") || v.includes("00668") || v.includes("00667") || v.includes("00599"))) {
        description = v.replace(/\\n/g, " ").trim();
      }
    }
    var headerCells = raw[headerRow] || [];
    var debitCol = -1, creditCol = -1;
    for (var h = 0; h < headerCells.length; h++) {
      var hv = String(headerCells[h] || "").toLowerCase();
      if (hv.includes("дебет") && debitCol === -1) debitCol = h;
      if (hv.includes("кредит") && creditCol === -1) creditCol = h;
    }
    if (debitCol >= 0) debit = parseNumber(row[debitCol]);
    if (creditCol >= 0) credit = parseNumber(row[creditCol]);
    if (debit === 0 && credit === 0) {
      for (var k = 15; k < row.length; k++) {
        var num = parseNumber(row[k]);
        if (num > 0) { if (!debit) debit = num; else if (!credit) { credit = num; break; } }
      }
    }
    if (dateStr && (debit > 0 || credit > 0)) {
      var parts = dateStr.split(".");
      var month = parts[2] + "-" + parts[1];
      transactions.push({ date: dateStr, month: month, debit: debit, credit: credit, description: description, category: categorize(description) });
    }
  }
  return transactions;
}

function fmtSum(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + " млрд";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " млн";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + " тыс";
  return n.toFixed(0);
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "#18181b", borderRadius: 14, padding: "18px 20px", border: "1px solid #27272a", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: "#71717a", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || "#e4e4e7", fontFamily: "Outfit, sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#52525b", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Home() {
  var _a = useState(null), transactions = _a[0], setTransactions = _a[1];
  var _b = useState(false), loading = _b[0], setLoading = _b[1];
  var _c = useState(""), fileName = _c[0], setFileName = _c[1];
  var _d = useState(null), aiInsight = _d[0], setAiInsight = _d[1];
  var _e = useState(false), aiLoading = _e[0], setAiLoading = _e[1];
  var _f = useState(false), dragOver = _f[0], setDragOver = _f[1];

  var handleFile = useCallback(function(file) {
    if (!file) return;
    setLoading(true);
    setFileName(file.name);
    setAiInsight(null);
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = new Uint8Array(ev.target.result);
        var wb = XLSX.read(data, { type: "array" });
        var txns = parseStatement(wb);
        setTransactions(txns);
      } catch (err) {
        alert("Ошибка парсинга: " + err.message);
      }
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  var stats = useMemo(function() {
    if (!transactions || transactions.length === 0) return null;
    var totalCredit = 0, totalDebit = 0;
    transactions.forEach(function(t) { totalCredit += t.credit; totalDebit += t.debit; });
    var netFlow = totalCredit - totalDebit;
    var byMonth = {};
    transactions.forEach(function(t) {
      if (!byMonth[t.month]) byMonth[t.month] = { month: t.month, income: 0, expense: 0 };
      byMonth[t.month].income += t.credit;
      byMonth[t.month].expense += t.debit;
    });
    var monthly = Object.values(byMonth).sort(function(a, b) { return a.month.localeCompare(b.month); });
    var incByCat = {}, expByCat = {};
    transactions.forEach(function(t) {
      if (t.credit > 0) incByCat[t.category] = (incByCat[t.category] || 0) + t.credit;
      if (t.debit > 0) expByCat[t.category] = (expByCat[t.category] || 0) + t.debit;
    });
    var incomeByCategory = Object.entries(incByCat).map(function(e) { return { name: e[0], value: e[1] }; }).sort(function(a, b) { return b.value - a.value; });
    var expenseByCategory = Object.entries(expByCat).map(function(e) { return { name: e[0], value: e[1] }; }).sort(function(a, b) { return b.value - a.value; });
    var topIncome = transactions.filter(function(t) { return t.credit > 0; }).sort(function(a, b) { return b.credit - a.credit; }).slice(0, 5);
    var topExpense = transactions.filter(function(t) { return t.debit > 0; }).sort(function(a, b) { return b.debit - a.debit; }).slice(0, 5);
    return { totalCredit: totalCredit, totalDebit: totalDebit, netFlow: netFlow, txCount: transactions.length, monthly: monthly, incomeByCategory: incomeByCategory, expenseByCategory: expenseByCategory, topIncome: topIncome, topExpense: topExpense };
  }, [transactions]);

  var getAiInsight = useCallback(async function() {
    if (!stats || !transactions) return;
    setAiLoading(true);
    try {
      var summary = "Компания: OXUS CAPITAL GROUP (Ustabor)\nПериод: " + transactions[0].date + " - " + transactions[transactions.length-1].date + "\nТранзакций: " + stats.txCount + "\nПоступления: " + fmtSum(stats.totalCredit) + " сум\nРасходы: " + fmtSum(stats.totalDebit) + " сум\nЧистый поток: " + fmtSum(stats.netFlow) + " сум\n\nПоступления:\n" + stats.incomeByCategory.map(function(c) { return "- " + c.name + ": " + fmtSum(c.value); }).join("\n") + "\n\nРасходы:\n" + stats.expenseByCategory.map(function(c) { return "- " + c.name + ": " + fmtSum(c.value); }).join("\n") + "\n\nПо месяцам:\n" + stats.monthly.map(function(m) { return m.month + ": доход " + fmtSum(m.income) + ", расход " + fmtSum(m.expense); }).join("\n");
      var res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: summary }),
      });
      var data = await res.json();
      setAiInsight(data.insight || data.error || "Ошибка");
    } catch (e) {
      setAiInsight("Ошибка: " + e.message);
    }
    setAiLoading(false);
  }, [stats, transactions]);

  var CTooltip = function(props) {
    if (!props.active || !props.payload || !props.payload.length) return null;
    return (
      <div style={{ background: "#1e1e22", padding: 12, borderRadius: 8, border: "1px solid #333" }}>
        <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 4 }}>{props.label}</div>
        {props.payload.map(function(p, i) { return <div key={i} style={{ fontSize: 13, color: p.color }}>{p.name}: {fmtSum(p.value)} сум</div>; })}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e4e4e7", fontFamily: "'Outfit', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{"\n        * { box-sizing: border-box; margin: 0; padding: 0; }\n        .upload-zone { border: 2px dashed #27272a; border-radius: 16px; padding: 60px 24px; text-align: center; cursor: pointer; transition: all 0.2s; }\n        .upload-zone:hover, .upload-zone.drag { border-color: #6366f1; background: rgba(99,102,241,0.05); }\n        .ai-btn { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; border-radius: 10px; padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }\n        .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }\n        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }\n        .fade-up { animation: fadeUp 0.4s ease-out; }\n        @keyframes pulse { 0%,100% { opacity:.4 } 50% { opacity:1 } }\n        .dots span { display:inline-block; width:5px; height:5px; border-radius:50%; background:#6366f1; margin:0 2px; animation: pulse 1s infinite; }\n        .dots span:nth-child(2) { animation-delay:.2s } .dots span:nth-child(3) { animation-delay:.4s }\n      "}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", background: "linear-gradient(135deg, #10b981, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            AI Финансист Ustabor
          </div>
          <div style={{ fontSize: 14, color: "#71717a", marginTop: 8 }}>Загрузите банковскую выписку для AI-анализа</div>
        </div>

        {!transactions ? (
          <label className={"upload-zone" + (dragOver ? " drag" : "")} style={{ display: "block", maxWidth: 500, margin: "0 auto" }}
            onDragOver={function(e) { e.preventDefault(); setDragOver(true); }}
            onDragLeave={function() { setDragOver(false); }}
            onDrop={function(e) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}>
            <input type="file" accept=".xls,.xlsx" onChange={function(e) { handleFile(e.target.files[0]); }} style={{ display: "none" }} />
            {loading ? (
              <div className="dots"><span></span><span></span><span></span></div>
            ) : (
              <div>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
                <div style={{ fontSize: 16, color: "#a1a1aa", marginBottom: 4 }}>Нажмите или перетащите файл</div>
                <div style={{ fontSize: 12, color: "#52525b" }}>Поддерживаются XLS и XLSX банковские выписки</div>
              </div>
            )}
          </label>
        ) : (
          <div className="fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#71717a" }}>📄 {fileName} — {stats.txCount} транзакций</div>
              <label style={{ fontSize: 13, color: "#6366f1", cursor: "pointer", textDecoration: "underline" }}>
                <input type="file" accept=".xls,.xlsx" onChange={function(e) { handleFile(e.target.files[0]); }} style={{ display: "none" }} />
                Загрузить другой
              </label>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard label="Поступления" value={fmtSum(stats.totalCredit) + " сум"} color="#10b981" />
              <StatCard label="Расходы" value={fmtSum(stats.totalDebit) + " сум"} color="#ef4444" />
              <StatCard label="Чистый поток" value={fmtSum(stats.netFlow) + " сум"} color={stats.netFlow >= 0 ? "#10b981" : "#ef4444"} />
              <StatCard label="Транзакций" value={String(stats.txCount)} color="#6366f1" />
            </div>

            <div style={{ background: "#18181b", borderRadius: 14, padding: 20, border: "1px solid #27272a", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📊 Доходы и расходы по месяцам</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={function(v) { return fmtSum(v); }} />
                  <Tooltip content={CTooltip} />
                  <Legend />
                  <Bar dataKey="income" name="Доходы" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="expense" name="Расходы" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
              {[{ title: "🟢 Поступления по категориям", data: stats.incomeByCategory }, { title: "🔴 Расходы по категориям", data: stats.expenseByCategory }].map(function(sec) {
                return (
                  <div key={sec.title} style={{ flex: 1, minWidth: 280, background: "#18181b", borderRadius: 14, padding: 20, border: "1px solid #27272a" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{sec.title}</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={sec.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                          {sec.data.map(function(_, i) { return <Cell key={i} fill={COLORS[i % COLORS.length]} />; })}
                        </Pie>
                        <Tooltip formatter={function(v) { return fmtSum(v) + " сум"; }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop: 8 }}>
                      {sec.data.slice(0, 6).map(function(c, i) {
                        return (
                          <div key={c.name} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
                            <span style={{ color: COLORS[i % COLORS.length] }}>● {c.name}</span>
                            <span style={{ color: "#a1a1aa" }}>{fmtSum(c.value)} сум</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#18181b", borderRadius: 14, padding: 20, border: "1px solid #27272a", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📈 Тренд чистого потока</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.monthly.map(function(m) { return { month: m.month, net: m.income - m.expense }; })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={function(v) { return fmtSum(v); }} />
                  <Tooltip content={CTooltip} />
                  <Line type="monotone" dataKey="net" name="Чистый поток" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "#18181b", borderRadius: 14, padding: 20, border: "1px solid #27272a", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>🤖 AI Анализ финансов</div>
                <button className="ai-btn" onClick={getAiInsight} disabled={aiLoading}>
                  {aiLoading ? <span className="dots"><span></span><span></span><span></span></span> : "Получить AI анализ"}
                </button>
              </div>
              {aiInsight && <div style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aiInsight}</div>}
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[{ title: "💰 Топ-5 поступлений", items: stats.topIncome, key: "credit", color: "#10b981" }, { title: "💸 Топ-5 расходов", items: stats.topExpense, key: "debit", color: "#ef4444" }].map(function(sec) {
                return (
                  <div key={sec.title} style={{ flex: 1, minWidth: 280, background: "#18181b", borderRadius: 14, padding: 20, border: "1px solid #27272a" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{sec.title}</div>
                    {sec.items.map(function(t, i) {
                      return (
                        <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1e1e22", fontSize: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#a1a1aa" }}>{t.date}</span>
                            <span style={{ color: sec.color, fontWeight: 600 }}>{fmtSum(t[sec.key])} сум</span>
                          </div>
                          <div style={{ color: "#52525b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {(t.description || "").substring(0, 80) || t.category}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}