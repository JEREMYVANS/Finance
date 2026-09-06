/* =====================================================================
   财务仪表盘 · 前端逻辑
   模式：本地优先（localStorage）+ 可选 Supabase 云端同步
   - 未配置 Supabase：直接用内置种子数据，打开即见仪表盘
   - 配置后：可在底部 Dock 点「云端同步」登录，数据上云多端可用
   ===================================================================== */
const SUPABASE_URL = "https://spoijqgsfiqkezddrzcq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OyaS63n4jvVCuoqaBxPozA_0U6CWNYL";
const USE_CLOUD = !SUPABASE_URL.includes("YOUR_");

const LOCAL_KEY = "finance_rows_v1";

/* 内置种子数据（2025-10 ~ 2026-07） */
const SEED = [
  {month:"2025-10",salary:10103.85,prev_balance:-141.5,saving_fund:1000,giving_mom:1000,auto_loan:1725,car_term:1,charging:80,parking:50,house_loan:3204.19,house_term:10,property_fee:256.61,vehicle_fee:85.5,water:0,electricity:7.55,gas:0},
  {month:"2025-11",salary:9313.46,prev_balance:0,saving_fund:1000,giving_mom:1000,auto_loan:1725,car_term:2,charging:20.67,parking:32,house_loan:3204.19,house_term:11,property_fee:513.22,vehicle_fee:85.5,water:5.94,electricity:51.54,gas:0},
  {month:"2025-12",salary:9376.57,prev_balance:0,saving_fund:1000,giving_mom:1000,auto_loan:1725,car_term:3,charging:44.96,parking:30,house_loan:3204.19,house_term:12,property_fee:256.61,vehicle_fee:85.5,water:0,electricity:51.84,gas:0},
  {month:"2026-01",salary:9723.63,prev_balance:-139.55,saving_fund:1000,giving_mom:1000,auto_loan:1725,car_term:4,charging:50.29,parking:32,house_loan:3164.48,house_term:13,property_fee:256.61,vehicle_fee:85.5,water:39.6,electricity:54.88,gas:38.9},
  {month:"2026-02",salary:17282.64,prev_balance:693.19,saving_fund:8000,giving_mom:1000,auto_loan:1725,car_term:5,charging:64.84,parking:92,house_loan:3044.81,house_term:14,property_fee:256.61,vehicle_fee:85.5,water:32.4,electricity:52.76,gas:0},
  {month:"2026-03",salary:9696,prev_balance:1300,saving_fund:1000,giving_mom:0,auto_loan:1725,car_term:6,charging:84.08,parking:129.5,house_loan:3283.93,house_term:15,property_fee:256.61,vehicle_fee:85.5,water:0,electricity:65.77,gas:44.2},
  {month:"2026-04",salary:9693.61,prev_balance:-676.83,saving_fund:1000,giving_mom:1000,auto_loan:1725,car_term:7,charging:91.09,parking:92.9,house_loan:3164.48,house_term:16,property_fee:256.61,vehicle_fee:85.5,water:46.42,electricity:77.63,gas:0},
  {month:"2026-05",salary:11919.04,prev_balance:0,saving_fund:1000,giving_mom:1000,auto_loan:1725,car_term:8,charging:104.92,parking:135,house_loan:3164.48,house_term:17,property_fee:256.61,vehicle_fee:85.5,water:0,electricity:93.54,gas:43.6},
  {month:"2026-06",salary:9935.98,prev_balance:0,saving_fund:1000,giving_mom:1000,auto_loan:1725,car_term:9,charging:96.71,parking:151.5,house_loan:3164.8,house_term:18,property_fee:256.61,vehicle_fee:85.5,water:0,electricity:144.65,gas:0},
  {month:"2026-07",salary:10368.29,prev_balance:1752.94,saving_fund:1000,giving_mom:1000,auto_loan:1725,car_term:10,charging:85.17,parking:33,house_loan:3164.48,house_term:19,property_fee:256.61,vehicle_fee:85.8,water:0,electricity:132.88,gas:0},
];

let sb = null;  // 本地模式保持 null；云端模式在 boot() 中动态加载 supabase-js 后初始化

/* 动态加载 Supabase JS：本地优先，CDN 兜底（避免浏览器端 CDN 不可达时降级） */
function loadSupabase() {
  return new Promise((resolve) => {
    if (window.supabase) { try { sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch (e) { console.warn(e); } resolve(); return; }
    const tryLocal = () => {
      const s = document.createElement("script");
      s.src = "supabase.min.js";
      s.onload = () => { try { sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch (e) { console.warn(e); } resolve(); };
      s.onerror = tryCDN;
      document.head.appendChild(s);
    };
    const tryCDN = () => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = () => { try { sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch (e) { console.warn(e); } resolve(); };
      s.onerror = () => { console.warn("Supabase 加载失败，已降级为本地模式"); resolve(); };
      document.head.appendChild(s);
    };
    tryLocal();
  });
}

/* ---------------- 计算口径 ---------------- */
const sum = (...n) => n.reduce((a, b) => a + (Number(b) || 0), 0);
function derive(r) {
  r.total = sum(r.saving_fund, r.giving_mom, r.auto_loan, r.charging, r.parking,
                r.house_loan, r.property_fee, r.vehicle_fee, r.water, r.electricity, r.gas);
  r.balance = r.salary - r.total;
  r.cat = {
    "储蓄与赠与": sum(r.saving_fund, r.giving_mom),
    "债务偿还":   sum(r.auto_loan, r.house_loan),
    "用车开销":   sum(r.charging, r.parking, r.vehicle_fee),
    "居家开销":   sum(r.property_fee, r.water, r.electricity, r.gas),
  };
  return r;
}

/* 期数自愈：以最早月份为锚点，之后逐月 +1（消除因重复提交造成的偏移） */
function recomputeTerms() {
  if (!ROWS.length) return;
  const sorted = [...ROWS].sort((a, b) => a.month.localeCompare(b.month));
  const base = sorted[0];
  const bCar = Number(base.car_term) || 0;
  const bHouse = Number(base.house_term) || 0;
  sorted.forEach((r, i) => {
    r.car_term = Math.max(0, Math.min(60, bCar + i));
    r.house_term = Math.max(0, Math.min(360, bHouse + i));
  });
}
const PAY_ITEMS = [
  ["房贷", "house_loan"], ["车贷", "auto_loan"], ["电费", "electricity"],
  ["水费", "water"], ["气费", "gas"], ["充电", "charging"],
  ["停车", "parking"], ["物业费", "property_fee"], ["车管费", "vehicle_fee"],
];
const FIELDS = ["month","salary","prev_balance","saving_fund","giving_mom","auto_loan",
  "charging","parking","house_loan","property_fee","vehicle_fee","water","electricity","gas"];
let DEFAULTS = { saving_fund: 1000, giving_mom: 1000, auto_loan: 1725, house_loan: 3164.48, property_fee: 256.61, vehicle_fee: 85.5 };
const DEFAULTS_KEY = "finance_defaults_v1";
function loadDefaults() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEFAULTS_KEY));
    if (saved && typeof saved === "object") DEFAULTS = { ...DEFAULTS, ...saved };
  } catch {}
}
function saveDefaults() { try { localStorage.setItem(DEFAULTS_KEY, JSON.stringify(DEFAULTS)); } catch {} }
loadDefaults();

/* ---------------- 状态 ---------------- */
let ROWS = [];
let forceLatest = false;   // 新增月份数据后，让筛选下拉自动跳到最新月份
let charts = {};
let currentUser = null;

/* ---------------- 工具 ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (n) => "¥" + (Number(n) || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
const ym = (m) => m.replace(/^\d{4}-/, (y) => y.slice(2)); // 2026-07 -> 26/07

/* ===================================================================
   数据存取：本地优先，可选云端同步
   =================================================================== */
const authView = $("#auth-view"), appView = $("#app-view");
let mode = "signin";

function strip(r) {  // 去掉派生字段，只保留原始列
  const o = {}; FIELDS.concat(["month","car_term","house_term"]).forEach(k => o[k] = r[k]); return o;
}
function loadFromLocal() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch {}
  if (!Array.isArray(data) || !data.length) { data = SEED.slice(); localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); }
  ROWS = data.map(derive);
  recomputeTerms();   // 加载时自愈期数，纠正历史偏移
  initCurrentSavings(ROWS);
  renderAll();
}
function saveLocal() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ROWS.map(strip)));
}
async function loadFromCloud() {
  const { data, error } = await sb.from("finance_records").select("*").eq("user_id", currentUser.id).order("month", { ascending: true });
  if (error) { alert("读取失败：" + error.message); return; }
  if (data && data.length) {
    ROWS = data.map(derive);
    recomputeTerms();   // 加载时自愈期数，纠正历史偏移
  } else if (ROWS.length) {
    // 云端无数据：首次把本地已有数据上传，保证多端一致
    const { error: upErr } = await sb.from("finance_records").upsert(
      ROWS.map(r => ({ user_id: currentUser.id, ...strip(r) })), { onConflict: "user_id,month" });
    if (upErr) console.warn("首次上传本地数据失败", upErr);
    else console.log("已将本地", ROWS.length, "条数据同步到云端");
  }
  initCurrentSavings(ROWS);
  renderAll();
}

/* ---- 认证（仅 USE_CLOUD 时启用）---- */
$$(".tab").forEach(t => t.onclick = () => {
  mode = t.dataset.mode;
  $$(".tab").forEach(x => x.classList.toggle("active", x === t));
  $("#auth-btn").textContent = mode === "signin" ? "登录" : "注册";
  $("#auth-msg").textContent = "";
});
$("#auth-btn").onclick = async () => {
  const email = $("#email").value.trim(), password = $("#password").value;
  const msg = $("#auth-msg"); msg.className = "msg";
  if (!email || password.length < 6) { msg.textContent = "请输入邮箱与至少 6 位密码"; msg.classList.add("err"); return; }
  msg.textContent = "处理中…";
  try {
    let res, error;
    if (mode === "signup") {
      res = await sb.auth.signUp({ email, password });
      error = res.error;
      if (!error) {
        // 即使 signUp 返回成功，通常也需要邮箱验证；切换到登录页并提示
        msg.textContent = "注册成功，请先到邮箱完成验证，再回来登录。";
        msg.classList.add("ok");
        mode = "signin";
        $$(".tab").forEach(x => x.classList.toggle("active", x.dataset.mode === "signin"));
        $("#auth-btn").textContent = "登录";
        return;
      }
    } else {
      res = await sb.auth.signInWithPassword({ email, password });
      error = res.error;
      if (!error) { msg.textContent = "登录成功"; msg.classList.add("ok"); return; }
    }
    msg.textContent = (error.message || JSON.stringify(error)).includes("confirm")
      ? "注册成功，请先到邮箱完成验证再登录。" : (error.message || "请求失败，请重试");
    msg.classList.add("err");
  } catch (e) {
    msg.textContent = "网络或配置异常：" + (e?.message || e);
    msg.classList.add("err");
  }
};

function enterApp() {
  authView.hidden = true; appView.hidden = false;
  $("#dock").hidden = false;
  if (USE_CLOUD && currentUser) { $("#user-email").textContent = currentUser.email; loadFromCloud(); }
  else loadFromLocal();
}

/* ===================================================================
   数据加载与渲染
   =================================================================== */
$("#auth-cancel").onclick = () => { authView.hidden = true; appView.hidden = false; $("#dock").hidden = false; };

/* 云端同步入口 / 退出登录 */
$("#sync-btn").onclick = () => {
  authView.hidden = false; appView.hidden = true; $("#dock").hidden = true;
  $("#auth-msg").textContent = ""; $("#auth-msg").className = "msg";
};
$("#logout-btn").onclick = () => {
  sb.auth.signOut();
  currentUser = null;
  $("#user-email").textContent = "";
  $("#logout-btn").hidden = true;
  $("#sync-btn").hidden = false;
  authView.hidden = true; appView.hidden = false; $("#dock").hidden = false;
  loadFromLocal();   // 断开云端后回到本地数据
};

function renderAll() {
  if (!ROWS.length) {
    $("#empty").hidden = false;
    $("#dashboard").hidden = true;
    $("#dock-sub").textContent = currentUser ? "登录用户：" + currentUser.email : "本地模式 · 暂无数据";
    return;
  }
  $("#empty").hidden = true;
  $("#dashboard").hidden = false;
  renderTopCards(); renderRepay(); renderChecklist(); renderSummary(); renderDetail(); renderCharts();
  forceLatest = false;   // 单次刷新只强制跳一次
}

/* ---------- 储蓄目标 ---------- */
const GOAL_KEY = "savings_goal_v1";
let SAVINGS_GOAL = 50000;
function loadGoal() {
  try { const v = Number(localStorage.getItem(GOAL_KEY)); if (v > 0) SAVINGS_GOAL = v; } catch {}
}
function saveGoal(v) { SAVINGS_GOAL = Math.max(1, Number(v) || 50000); localStorage.setItem(GOAL_KEY, SAVINGS_GOAL); }
loadGoal();

/* ---------- 应急储蓄当前金额（可手动调整，初始为累计基金储蓄） ---------- */
const SAVE_CUR_KEY = "savings_current_v1";
let SAVINGS_CURRENT = 0;
function initCurrentSavings(rows) {
  const persisted = Number(localStorage.getItem(SAVE_CUR_KEY));
  if (!Number.isNaN(persisted) && persisted > 0) { SAVINGS_CURRENT = persisted; return; }
  SAVINGS_CURRENT = rows.reduce((s, r) => s + (Number(r.saving_fund) || 0), 0);
  localStorage.setItem(SAVE_CUR_KEY, SAVINGS_CURRENT);
}
function saveCurrent(v) { SAVINGS_CURRENT = Math.max(0, Number(v) || 0); localStorage.setItem(SAVE_CUR_KEY, SAVINGS_CURRENT); }

function pctDelta(curr, prev) {
  if (!prev) return 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}
function deltaHtml(value) {
  const v = Number(value) || 0;
  const cls = v >= 0 ? "delta-up" : "delta-down";
  return `<span class="${cls}">${v >= 0 ? "+" : ""}${v.toFixed(1)}%</span>`;
}

/* 顶部双卡片：日常现金流 + 应急储蓄 */
function renderTopCards() {
  const last = ROWS[ROWS.length - 1];
  const prev = ROWS.length > 1 ? ROWS[ROWS.length - 2] : last;

  // 日常现金流
  $("#flow-income").textContent = fmt(last.salary);
  $("#flow-spent").textContent = fmt(last.total);
  $("#flow-remain").textContent = fmt(last.balance);
  $("#flow-remain").style.color = last.balance < 0 ? "var(--neg)" : "var(--balance)";
  $("#flow-spent-delta").innerHTML = deltaHtml(pctDelta(last.total, prev.total));
  $("#flow-remain-delta").innerHTML = deltaHtml(pctDelta(last.balance, prev.balance));

  // 应急储蓄（当前金额手动调整；本月新增 = 基金储蓄）
  const added = last.saving_fund;
  const prevAdded = prev.saving_fund;
  $("#save-current").textContent = fmt(SAVINGS_CURRENT);
  $("#save-goal").textContent = fmt(SAVINGS_GOAL);
  $("#save-added").textContent = fmt(added);
  $("#save-added").style.color = added < 0 ? "var(--neg)" : "var(--balance)";
  $("#save-added-delta").innerHTML = deltaHtml(pctDelta(added, prevAdded));
  const progress = SAVINGS_GOAL > 0 ? Math.min(100, (SAVINGS_CURRENT / SAVINGS_GOAL) * 100).toFixed(1) + "%" : "–";
  $("#save-progress").textContent = progress;

  // Dock 标题
  $("#dock-sub").textContent = "数据截至 " + last.month;
}

// 调整应急储蓄当前金额
$("#save-edit-btn").onclick = () => { $("#save-edit-box").classList.add("show"); $("#save-input").value = SAVINGS_CURRENT; };
$("#save-save-btn").onclick = () => { saveCurrent($("#save-input").value); $("#save-edit-box").classList.remove("show"); renderTopCards(); };

// 调整储蓄目标
$("#goal-edit-btn").onclick = () => { $("#goal-edit-box").classList.add("show"); $("#goal-input").value = SAVINGS_GOAL; };
$("#goal-save-btn").onclick = () => { saveGoal($("#goal-input").value); $("#goal-edit-box").classList.remove("show"); renderTopCards(); };

function renderRepay() {
  const r = ROWS[ROWS.length - 1];
  const cp = Math.min(100, r.car_term / 60 * 100);
  const hp = Math.min(100, r.house_term / 360 * 100);
  $("#car-fill").style.width = cp + "%";
  $("#house-fill").style.width = hp + "%";
  $("#car-pct").textContent = `${r.car_term} / 60（${cp.toFixed(1)}%）`;
  $("#house-pct").textContent = `${r.house_term} / 360（${hp.toFixed(1)}%）`;

  const carLeft = Math.max(0, 60 - r.car_term);
  const houseLeft = Math.max(0, 360 - r.house_term);
  const monthlyRepay = r.auto_loan + r.house_loan;
  $("#repay-extra").innerHTML = `
    <div class="r-stat">
      车贷剩余 ${carLeft} 期 · 房贷剩余 ${houseLeft} 期 · 本月共还 ${fmt(monthlyRepay)}
    </div>
  `;
}

function renderChecklist() {
  const sel = $("#checklist-month");
  const cur = sel.value;
  const latest = ROWS[ROWS.length - 1].month;
  sel.innerHTML = ROWS.map(r => `<option value="${r.month}">${r.month}</option>`).join("");
  sel.value = forceLatest ? latest : ((cur && ROWS.some(r => r.month === cur)) ? cur : latest);
  sel.onchange = () => renderChecklistMonth(sel.value);
  renderChecklistMonth(sel.value);
}

function renderChecklistMonth(month) {
  const r = ROWS.find(x => x.month === month) || ROWS[ROWS.length - 1];
  const head = PAY_ITEMS.map(([label]) => `<th>${label}</th>`).join("");
  const cells = PAY_ITEMS.map(([_, key]) => {
    const paid = (Number(r[key]) || 0) > 0;
    return `<td class="pay-cell ${paid ? "ok" : "no"}">${paid ? "✓" : "—"}</td>`;
  }).join("");
  $("#checklist").innerHTML = `<thead><tr>${head}</tr></thead><tbody><tr>${cells}</tr></tbody>`;
}

function renderSummary() {
  let rows = ROWS.slice().reverse().map(r => `
    <tr class="${r.balance < 0 ? "neg" : ""}">
      <td>${r.month}</td><td>${fmt(r.salary)}</td>
      <td>${fmt(r.cat["储蓄与赠与"])}</td><td>${fmt(r.cat["债务偿还"])}</td>
      <td>${fmt(r.cat["用车开销"])}</td><td>${fmt(r.cat["居家开销"])}</td>
      <td>${fmt(r.total)}</td><td>${fmt(r.balance)}</td>
    </tr>`).join("");
  $("#summary").innerHTML = `<thead><tr><th>月份</th><th>工资</th><th>储蓄与赠与</th><th>债务偿还</th><th>用车开销</th><th>居家开销</th><th>总支出</th><th>当月结余</th></tr></thead><tbody>${rows}</tbody>`;
}

const DETAIL_COLS = [
  ["month","月份"],["salary","工资"],["prev_balance","上月结余"],["saving_fund","基金储蓄"],
  ["giving_mom","给妈妈"],["auto_loan","车贷"],["charging","充电"],["parking","停车"],
  ["house_loan","房贷"],["property_fee","物业费"],["vehicle_fee","车辆管理费"],
  ["water","水费"],["electricity","电费"],["gas","气费"],["car_term","车贷期数"],["house_term","房贷期数"]
];

function renderDetail() {
  let head = DETAIL_COLS.map(c => `<th>${c[1]}</th>`).join("");
  let body = ROWS.slice().reverse().map(r => {
    return "<tr>" + DETAIL_COLS.map(c => {
      if (c[0] === "month") return `<td class="mon">${r.month}</td>`;
      if (c[0] === "car_term" || c[0] === "house_term") return `<td>${r[c[0]]}</td>`;
      const v = Number(r[c[0]]) || 0;
      return `<td>${v.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}</td>`;
    }).join("") + "</tr>";
  }).join("");
  $("#detail").innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
}

/* ---------------- 图表 ---------------- */
const CAT_NAMES = ["储蓄与赠与", "债务偿还", "用车开销", "居家开销"];
const CAT_COLORS = { "储蓄与赠与": "#4e79a7", "债务偿还": "#e15759", "用车开销": "#f28e2b", "居家开销": "#59a14f" };

/* 金额刻度：≥1000 显示 ¥18K，否则 ¥160 */
function kFmt(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  const n = Number(v);
  if (Math.abs(n) >= 1000) return "¥" + (n / 1000).toFixed(0) + "K";
  return "¥" + Math.round(n);
}

function buildLegend(id, items) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = items.map(i => `<span class="item"><span class="dot" style="background:${i.color}"></span>${i.label}</span>`).join("");
}

function renderCharts() {
  try {
    // 暗黑风全局默认值
    Chart.defaults.color = "#9fb0c3";
    Chart.defaults.borderColor = "#2b3748";
    Chart.defaults.font.family = "-apple-system,PingFang SC,Microsoft YaHei,sans-serif";
    const pal = { salary: "#4e79a7", total: "#e15759", balance: "#59a14f",
                  charge: "#4e79a7", water: "#76b7b2", elec: "#f28e2b", gas: "#b07aa1" };

    // ===== 近6个月现金流对比（柱状+结余趋势线） =====
    const last6 = ROWS.slice(-6);
    const labels6 = last6.map(r => r.month);
    if (charts.trend) charts.trend.destroy();
    charts.trend = new Chart($("#trend"), {
      type: "bar",
      data: { labels: labels6, datasets: [
        { label: "收入", data: last6.map(r => r.salary), backgroundColor: pal.salary, yAxisID: "y", order: 2, barPercentage: 0.6 },
        { label: "支出", data: last6.map(r => r.total), backgroundColor: pal.total, yAxisID: "y", order: 3, barPercentage: 0.6 },
        { label: "结余", data: last6.map(r => r.balance), backgroundColor: pal.balance, yAxisID: "y", order: 4, barPercentage: 0.6 },
        { label: "结余趋势", data: last6.map(r => r.balance), borderColor: "#7ed085", backgroundColor: "#7ed085",
          type: "line", yAxisID: "y1", tension: .35, fill: false, pointRadius: 3, pointHoverRadius: 5, borderWidth: 2.5, order: 1 },
      ] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false },
          tooltip: { filter: ctx => ctx.dataset.label !== "结余趋势",
            callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } } },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { position: "left", grid: { color: "#2b3748" }, border: { display: false },
            ticks: { callback: v => kFmt(v) } },
          y1: { position: "right", grid: { display: false }, border: { display: false },
            ticks: { callback: v => kFmt(v) } }
        } } });
    buildLegend("#trend-legend", [
      { label: "收入", color: pal.salary },
      { label: "支出", color: pal.total },
      { label: "结余", color: pal.balance }
    ]);

    // 支出构成（月份可切换）
    buildPieSelect();
    renderPie($("#pie-month").value);

    // ===== 近6个月生活杂费趋势 =====
    if (charts.util) charts.util.destroy();
    charts.util = new Chart($("#util"), { type: "line",
      data: { labels: labels6, datasets: [
        { label: "充电", data: last6.map(r => r.charging), borderColor: pal.charge, backgroundColor: pal.charge, tension: .35, fill: false, pointRadius: 3 },
        { label: "水", data: last6.map(r => r.water), borderColor: pal.water, backgroundColor: pal.water, tension: .35, fill: false, pointRadius: 3 },
        { label: "电", data: last6.map(r => r.electricity), borderColor: pal.elec, backgroundColor: pal.elec, tension: .35, fill: false, pointRadius: 3 },
        { label: "气", data: last6.map(r => r.gas), borderColor: pal.gas, backgroundColor: pal.gas, tension: .35, fill: false, pointRadius: 3 },
      ] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } } },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { grid: { color: "#2b3748" }, border: { display: false }, ticks: { callback: v => kFmt(v) } }
        } } });
    buildLegend("#util-legend", [
      { label: "充电", color: pal.charge },
      { label: "水", color: pal.water },
      { label: "电", color: pal.elec },
      { label: "气", color: pal.gas }
    ]);
  } catch (e) {
    console.error("图表渲染失败（不影响表格数据）：", e);
  }
}

function buildPieSelect() {
  const sel = $("#pie-month");
  const cur = sel.value;
  const latest = ROWS[ROWS.length - 1].month;
  sel.innerHTML = ROWS.map(r => `<option value="${r.month}">${r.month}</option>`).join("");
  sel.value = forceLatest ? latest : ((cur && ROWS.some(r => r.month === cur)) ? cur : latest);
  sel.onchange = () => renderPie(sel.value);
}

function renderPie(month) {
  const r = ROWS.find(x => x.month === month) || ROWS[ROWS.length - 1];
  if (charts.pie) charts.pie.destroy();
  charts.pie = new Chart($("#pie"), { type: "doughnut",
    data: { labels: CAT_NAMES, datasets: [{ data: CAT_NAMES.map(n => r.cat[n]), backgroundColor: CAT_NAMES.map(n => CAT_COLORS[n]), borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "58%",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmt(ctx.raw)}` } } } } });
  buildLegend("#pie-legend", CAT_NAMES.map(n => ({ label: n, color: CAT_COLORS[n] })));
}

/* ===================================================================
   添加数据
   =================================================================== */
function nextMonth() {
  if (!ROWS.length) return "2026-08";
  const last = ROWS[ROWS.length - 1].month;
  const [y, m] = last.split("-").map(Number);
  const next = new Date(y, m, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}
function fillDefaults() {
  const form = $("#add-form");
  form.month.value = nextMonth();
  Object.entries(DEFAULTS).forEach(([k, v]) => { const el = form[k]; if (el) el.value = v; });
}
$("#add-btn").onclick = () => { $("#modal-add").hidden = false; $("#add-msg").textContent = ""; fillDefaults(); };
$("#import-btn").onclick = () => { $("#modal-import").hidden = false; $("#import-msg").textContent = ""; };
$("#empty-add").onclick = () => { $("#modal-add").hidden = false; $("#add-msg").textContent = ""; fillDefaults(); };
let adjustTargetKey = null;
function openAdjust(key, label) {
  adjustTargetKey = key;
  $("#adjust-title").textContent = `设置${label}默认值（元）`;
  $("#adjust-input").value = DEFAULTS[key];
  $("#adjust-msg").textContent = "";
  $("#modal-adjust").hidden = false;
  setTimeout(() => $("#adjust-input").focus(), 50);
}
$("#adjust-save").onclick = () => {
  const n = Number($("#adjust-input").value);
  if (Number.isNaN(n) || n < 0) { $("#adjust-msg").textContent = "请输入有效金额"; $("#adjust-msg").className = "msg err"; return; }
  DEFAULTS[adjustTargetKey] = n;
  saveDefaults();
  const form = $("#add-form");
  if (form && !$("#modal-add").hidden) form[adjustTargetKey].value = n;
  $("#modal-adjust").hidden = true;
};
// 回车保存
$("#adjust-input").onkeydown = (e) => { if (e.key === "Enter") $("#adjust-save").click(); };
function bindAdjust(id, key, label) {
  $(id).onclick = () => openAdjust(key, label);
}
bindAdjust("#adjust-house", "house_loan", "房贷");
bindAdjust("#adjust-saving_fund", "saving_fund", "基金储蓄");
$$("[data-close]").forEach(b => b.onclick = () => { b.closest(".modal").hidden = true; });

$("#add-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target).entries());
  const row = { month: f.month };
  FIELDS.filter(x => x !== "month").forEach(k => row[k] = Number(f[k]) || 0);
  const msg = $("#add-msg");
  // 同月份覆盖
  const existed = ROWS.find(r => r.month === row.month);
  const oldFund = existed ? (Number(existed.saving_fund) || 0) : 0;
  ROWS = ROWS.filter(r => r.month !== row.month);
  ROWS.push(derive(row));
  ROWS.sort((a, b) => a.month.localeCompare(b.month));
  recomputeTerms();   // 期数按月份顺序自愈，确保新增月份精确 +1
  // 应急储蓄金额随基金储蓄变动自动修正
  SAVINGS_CURRENT += (Number(row.saving_fund) || 0) - oldFund;
  localStorage.setItem(SAVE_CUR_KEY, SAVINGS_CURRENT);
  if (USE_CLOUD && currentUser) {
    const { error } = await sb.from("finance_records").upsert(
      { user_id: currentUser.id, ...strip(row) }, { onConflict: "user_id,month" });
    if (error) { msg.textContent = error.message; msg.className = "msg err"; return; }
  } else {
    saveLocal();
  }
  e.target.reset(); $("#modal-add").hidden = true;
  forceLatest = true;          // 新增月份后，筛选自动跳到最新月份
  renderAll();
};

/* ===================================================================
   导入 CSV
   =================================================================== */
$("#csv-go").onclick = async () => {
  const file = $("#csv-file").files[0];
  const msg = $("#import-msg");
  if (!file) { msg.textContent = "请先选择 CSV 文件"; msg.className = "msg err"; return; }
  const text = await file.text();
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim());
  const incoming = lines.slice(1).map(line => {
    const vals = line.split(",");
    const o = {};
    headers.forEach((h, i) => { o[h] = (h === "month") ? vals[i] : (Number(vals[i]) || 0); });
    return o.month ? derive(o) : null;
  }).filter(Boolean);
  // 合并去重（按 month）
  const map = new Map(ROWS.map(r => [r.month, r]));
  incoming.forEach(r => map.set(r.month, r));
  ROWS = [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  recomputeTerms();   // 期数按月份顺序自愈
  if (USE_CLOUD && currentUser) {
    const { error } = await sb.from("finance_records").upsert(
      incoming.map(r => ({ user_id: currentUser.id, ...strip(r) })), { onConflict: "user_id,month" });
    if (error) { msg.textContent = error.message; msg.className = "msg err"; return; }
  } else {
    saveLocal();
  }
  msg.textContent = `成功导入 ${incoming.length} 行`; msg.className = "msg ok";
  $("#modal-import").hidden = true;
  forceLatest = true;          // 新增月份后，筛选自动跳到最新月份
  renderAll();
};

/* ---------------- 启动 ---------------- */
async function boot() {
  if (USE_CLOUD) {
    await loadSupabase();
    if (!sb) { enterApp(); return; }   // 加载失败则降级为本地模式
    // 混合模式：打开即用本地种子数据，提供「云端同步」入口（不强制登录）
    $("#sync-btn").hidden = false;
    enterApp();
    // 若已有登录会话，自动续接并拉取云端数据
    try {
      const { data } = await sb.auth.getSession();
      if (data?.session?.user) {
        currentUser = data.session.user;
        $("#sync-btn").hidden = true;
        $("#logout-btn").hidden = false;
        $("#user-email").textContent = currentUser.email;
        loadFromCloud();
      }
    } catch (e) { console.warn("getSession 失败", e); }
    sb.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        currentUser = session.user;
        authView.hidden = true; appView.hidden = false; $("#dock").hidden = false;
        $("#sync-btn").hidden = true;
        $("#logout-btn").hidden = false;
        $("#user-email").textContent = currentUser.email;
        loadFromCloud();
      }
      // session 为空（含退出）时保留当前视图，由按钮显式处理
    });
  } else {
    // 本地模式：打开即进入仪表盘（内置种子数据），不依赖任何外部 CDN
    enterApp();
  }
}
boot();
