const canvas = document.querySelector("#price-chart");
const ctx = canvas.getContext("2d");
const tableBody = document.querySelector("#price-table");
const statusText = document.querySelector("#status");
const tooltip = document.querySelector("#chart-tooltip");
const exchangeButton = document.querySelector("#refresh-exchange");
const currentExchange = document.querySelector("#current-exchange");

let sourceData = { rows: [], exchangeRate: 1503.96, exchangeRateDate: "2026-05-29" };
let coffeeMode = "both";
let periodYears = 1;
let chartGeometry = null;

const EXCHANGE_STORAGE_KEY = "coffee-price-usd-krw-rate";
const EXCHANGE_APIS = [
  {
    url: "https://open.er-api.com/v6/latest/USD",
    read(data) {
      if (data.result !== "success") throw new Error("ExchangeRate-API 응답 오류");
      const timestamp = Number(data.time_last_update_unix);
      return {
        rate: Number(data.rates?.KRW),
        date: timestamp
          ? new Date(timestamp * 1000).toISOString().slice(0, 10)
          : String(data.time_last_update_utc || "").slice(0, 16),
      };
    },
  },
  {
    url: "https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW",
    read(data) {
      return {
        rate: Number(data.rates?.KRW),
        date: data.date,
      };
    },
  },
];

const embeddedRows = [
  ["2024-01-01",203.87913,148.12522],["2024-02-01",208.78333,153.22762],
  ["2024-03-01",208.91333,165.83952],["2024-04-01",239.86636,193.675],
  ["2024-05-01",232.34261,186.45739],["2024-06-01",248.405,204.327],
  ["2024-07-01",257.0987,214.5413],["2024-08-01",261.43773,214.69545],
  ["2024-09-01",278.76048,242.4619],["2024-10-01",276.77739,221.89565],
  ["2024-11-01",304.95286,226.13],["2024-12-01",344.11864,237.62182],
  ["2025-01-01",353.93348,244.93913],["2025-02-01",409.5165,263.045],
  ["2025-03-01",404.21048,257.68429],["2025-04-01",392.91273,246.54909],
  ["2025-05-01",397.58864,237.30318],["2025-06-01",363.16238,196.21381],
  ["2025-07-01",316.72565,167.16783],["2025-08-01",365.68571,198.86095],
  ["2025-09-01",399.55136,210.84136],["2025-10-01",403.79261,215.06],
  ["2025-11-01",409.679,214.826],["2025-12-01",380.41727,190.23818],
  ["2026-01-01",363.91045,192.28909],["2026-02-01",321.3525,179.5945],
  ["2026-03-01",334.11182,176.76409],["2026-04-01",331.22273,164.645],
  ["2026-05-01",317.53385,166.58692]
].map(([date, arabica, robusta]) => ({ date, arabica, robusta }));

const annualFallbackRows = [
  ["2016-01-01",163.83998,88.61686],["2017-01-01",150.75595,100.95965],
  ["2018-01-01",132.71493,84.77464],["2019-01-01",130.55576,73.56538],
  ["2020-01-01",150.83195,68.75570],["2021-01-01",204.69403,89.82432],
  ["2022-01-01",255.46590,103.62980],["2023-01-01",205.95975,119.12706],
  ["2024-01-01",255.44463,200.74982],["2025-01-01",383.09798,220.22740]
].map(([date, arabica, robusta]) => ({ date, arabica, robusta, period: "annual" }));

function format(value, digits = 2) {
  return Number(value).toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function monthLabel(dateText) {
  const [year, month] = dateText.split("-");
  return `${year}.${month}`;
}

function rowLabel(row) {
  if (row.period === "latest") {
    return `${row.date.slice(0, 4)}년 최신(${Number(row.date.slice(5, 7))}월)`;
  }
  return row.period === "annual" ? `${row.date.slice(0, 4)}년` : monthLabel(row.date);
}

function annualRowsWithLatest() {
  const latest = sourceData.rows.at(-1);
  if (!latest) return annualFallbackRows;

  const latestYear = Number(latest.date.slice(0, 4));
  const completedRows = annualFallbackRows.filter(
    (row) => Number(row.date.slice(0, 4)) < latestYear
  );
  return [
    ...completedRows,
    { ...latest, period: "latest" },
  ];
}

function percentChange(current, previous) {
  return previous ? ((current - previous) / previous) * 100 : 0;
}

function wonPerKg(centsPerPound) {
  const exchangeRate = Number(sourceData.exchangeRate) || 1503.96;
  return (centsPerPound / 100) * exchangeRate * 2.2046226218;
}

function formatWon(value) {
  return `${Math.round(value).toLocaleString("ko-KR")}원/kg`;
}

function loadStoredExchangeRate() {
  try {
    const stored = JSON.parse(localStorage.getItem(EXCHANGE_STORAGE_KEY));
    const rate = Number(stored?.rate);
    if (!Number.isFinite(rate) || rate < 500 || rate > 3000 || !stored?.date) return;
    sourceData.exchangeRate = rate;
    sourceData.exchangeRateDate = stored.date;
  } catch {
    // Storage can be unavailable in private browsing or restricted environments.
  }
}

function saveExchangeRate(rate, date) {
  try {
    localStorage.setItem(EXCHANGE_STORAGE_KEY, JSON.stringify({ rate, date }));
  } catch {
    // The updated rate still applies for the current page session.
  }
}

function formatExchangeDate(date) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : String(date || "기준일 미상");
}

function showCurrentExchange(message = "") {
  const rate = Number(sourceData.exchangeRate) || 1503.96;
  currentExchange.classList.toggle("error", Boolean(message));
  currentExchange.textContent = message ||
    `현재 1달러 = ${format(rate)}원 · ${formatExchangeDate(sourceData.exchangeRateDate)}`;
}

function validateExchange(exchange) {
  if (
    !Number.isFinite(exchange.rate) ||
    exchange.rate < 500 ||
    exchange.rate > 3000 ||
    !exchange.date
  ) {
    throw new Error("올바르지 않은 환율 응답");
  }
  return exchange;
}

async function fetchLatestExchange() {
  const errors = [];
  for (const api of EXCHANGE_APIS) {
    try {
      const response = await fetch(api.url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return validateExchange(api.read(await response.json()));
    } catch (error) {
      errors.push(error);
    }
  }
  throw new AggregateError(errors, "모든 환율 서버 요청 실패");
}

async function updateExchangeRate() {
  exchangeButton.disabled = true;
  exchangeButton.textContent = "환율 확인 중...";
  exchangeButton.classList.remove("success", "error");
  currentExchange.classList.remove("error");
  currentExchange.textContent = "최신 환율을 확인하는 중...";

  try {
    const exchange = await fetchLatestExchange();
    sourceData.exchangeRate = exchange.rate;
    sourceData.exchangeRateDate = exchange.date;
    saveExchangeRate(exchange.rate, exchange.date);
    render();
    exchangeButton.textContent = "환율 적용 완료";
    exchangeButton.classList.add("success");
  } catch (error) {
    console.error("Exchange rate update failed:", error);
    const rate = Number(sourceData.exchangeRate) || 1503.96;
    showCurrentExchange(`갱신 실패 · 기존 ${format(rate)}원 유지`);
    exchangeButton.textContent = "환율 확인 실패";
    exchangeButton.classList.add("error");
  } finally {
    window.setTimeout(() => {
      exchangeButton.disabled = false;
      exchangeButton.textContent = "최신 환율 적용";
      exchangeButton.classList.remove("success", "error");
    }, 2200);
  }
}

async function loadData() {
  statusText.classList.remove("error");
  statusText.textContent = "최신 데이터를 확인하는 중입니다.";

  try {
    const response = await fetch(`data.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    sourceData = await response.json();
    if (!Array.isArray(sourceData.rows) || !sourceData.rows.length) throw new Error("데이터가 없습니다.");
    statusText.textContent = `최근 업데이트: ${sourceData.updatedAt} · 월평균 자료 ${sourceData.rows.length}건`;
  } catch {
    sourceData = {
      updatedAt: "내장 데이터",
      exchangeRate: 1503.96,
      exchangeRateDate: "2026-05-29",
      rows: embeddedRows,
    };
    statusText.textContent = "내장 데이터를 표시했습니다. GitHub Actions 실행 후 전체 10년 자료로 자동 교체됩니다.";
  }

  loadStoredExchangeRate();
  render();
}

function filteredRows() {
  const rows = sourceData.rows;
  if (!rows.length) return [];
  const first = new Date(`${rows[0].date}T00:00:00`);
  const last = new Date(`${rows.at(-1).date}T00:00:00`);
  const spanYears = (last - first) / (365.25 * 24 * 60 * 60 * 1000);
  if (periodYears === 10 && spanYears < 9) {
    return annualRowsWithLatest();
  }
  const latest = new Date(`${rows.at(-1).date}T00:00:00`);
  const cutoff = new Date(latest);
  cutoff.setFullYear(cutoff.getFullYear() - periodYears);
  cutoff.setMonth(cutoff.getMonth() + 1);
  return rows.filter((row) => new Date(`${row.date}T00:00:00`) >= cutoff);
}

function render() {
  const rows = filteredRows();
  const annualMode = rows[0]?.period === "annual";
  renderSummary(rows);
  renderLegend();
  renderTable(rows);
  resizeChart();
  document.querySelector("#chart-title").textContent = annualMode
    ? "최근 10년 연평균 가격 변화 + 현재 가격"
    : `최근 ${periodYears === 1 ? "1년" : "10년"} 가격 변화`;
  document.querySelector("#table-title").textContent = annualMode ? "연도별 가격표" : "월별 가격표";
  document.querySelector("#date-column-title").textContent = annualMode ? "기준연도" : "기준월";
  document.querySelector("#exchange-note").textContent =
    `원화 가격은 ${sourceData.exchangeRateDate || "최근 기준"} 원/달러 환율 ` +
    `1달러=${format(sourceData.exchangeRate || 1503.96)}원만 적용한 단순 환산값입니다.`;
  showCurrentExchange();
}

function renderSummary(rows) {
  const latest = sourceData.rows.at(-1);
  const previous = sourceData.rows.at(-2);
  if (!latest || !previous) return;

  setPrice("arabica", latest.arabica, percentChange(latest.arabica, previous.arabica));
  setPrice("robusta", latest.robusta, percentChange(latest.robusta, previous.robusta));

  const candidates = [];
  rows.forEach((row) => {
    if (coffeeMode !== "robusta") candidates.push({ name: "아라비카", date: row.date, value: row.arabica, period: row.period });
    if (coffeeMode !== "arabica") candidates.push({ name: "로부스타", date: row.date, value: row.robusta, period: row.period });
  });
  const high = candidates.reduce((best, item) => item.value > best.value ? item : best);
  const low = candidates.reduce((best, item) => item.value < best.value ? item : best);
  document.querySelector("#period-high").textContent = `${format(high.value)} US￠/lb`;
  document.querySelector("#period-high-krw").textContent = `약 ${formatWon(wonPerKg(high.value))}`;
  document.querySelector("#period-high-note").textContent = `${high.name} · ${rowLabel(high)}`;
  document.querySelector("#period-low").textContent = `${format(low.value)} US￠/lb`;
  document.querySelector("#period-low-krw").textContent = `약 ${formatWon(wonPerKg(low.value))}`;
  document.querySelector("#period-low-note").textContent = `${low.name} · ${rowLabel(low)}`;
}

function setPrice(id, value, change) {
  document.querySelector(`#${id}-latest`).textContent = format(value);
  document.querySelector(`#${id}-krw`).textContent = `약 ${formatWon(wonPerKg(value))}`;
  const element = document.querySelector(`#${id}-change`);
  element.textContent = `전월 대비 ${change >= 0 ? "상승" : "하락"} ${format(Math.abs(change))}%`;
  element.className = `change ${change >= 0 ? "up" : "down"}`;
}

function renderLegend() {
  const legend = document.querySelector("#chart-legend");
  legend.replaceChildren();
  if (coffeeMode !== "robusta") legend.insertAdjacentHTML("beforeend", '<span><i class="arabica"></i>아라비카</span>');
  if (coffeeMode !== "arabica") legend.insertAdjacentHTML("beforeend", '<span><i class="robusta"></i>로부스타</span>');
}

function renderTable(rows) {
  tableBody.replaceChildren();
  [...rows].reverse().forEach((row) => {
    const index = rows.findIndex((item) => item.date === row.date);
    const previous = rows[index - 1];
    const arabicaChange = previous ? percentChange(row.arabica, previous.arabica) : 0;
    const robustaChange = previous ? percentChange(row.robusta, previous.robusta) : 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rowLabel(row)}</td>
      <td>${format(row.arabica)}</td>
      <td class="${arabicaChange >= 0 ? "up" : "down"}">${arabicaChange >= 0 ? "+" : ""}${format(arabicaChange)}%</td>
      <td>${format(row.robusta)}</td>
      <td class="${robustaChange >= 0 ? "up" : "down"}">${robustaChange >= 0 ? "+" : ""}${format(robustaChange)}%</td>
    `;
    tableBody.append(tr);
  });
}

function activeSeries() {
  const series = [];
  if (coffeeMode !== "robusta") series.push({ key: "arabica", label: "아라비카", color: "#248657" });
  if (coffeeMode !== "arabica") series.push({ key: "robusta", label: "로부스타", color: "#9b6438" });
  return series;
}

function resizeChart() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawChart();
}

function drawChart() {
  const rows = filteredRows();
  if (!rows.length) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const mobile = width < 600;
  const pad = mobile ? { top: 26, right: 12, bottom: 54, left: 54 } : { top: 24, right: 22, bottom: 48, left: 62 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const series = activeSeries();
  const values = series.flatMap((item) => rows.map((row) => row[item.key]));
  const minRaw = Math.min(...values);
  const maxRaw = Math.max(...values);
  const margin = Math.max((maxRaw - minRaw) * .13, 10);
  const min = Math.max(0, minRaw - margin);
  const max = maxRaw + margin;
  const x = (index) => pad.left + index * (plotWidth / Math.max(rows.length - 1, 1));
  const y = (value) => pad.top + (1 - (value - min) / (max - min)) * plotHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.font = `${mobile ? 9 : 10}px "Malgun Gothic", sans-serif`;
  ctx.textBaseline = "middle";

  for (let tick = 0; tick <= 5; tick += 1) {
    const value = min + (max - min) * tick / 5;
    const yy = y(value);
    ctx.beginPath();
    ctx.strokeStyle = "#e5eae6";
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(pad.left + plotWidth, yy);
    ctx.stroke();
    ctx.fillStyle = "#69736c";
    ctx.textAlign = "right";
    ctx.fillText(format(value, 0), pad.left - 7, yy);
  }

  const annualMode = rows[0]?.period === "annual";
  const labelEvery = annualMode ? (mobile ? 2 : 1) : periodYears === 10 ? (mobile ? 18 : 12) : (mobile ? 2 : 1);
  rows.forEach((row, index) => {
    if (index % labelEvery !== 0 && index !== rows.length - 1) return;
    ctx.fillStyle = "#69736c";
    ctx.textAlign = "center";
    ctx.fillText(rowLabel(row), x(index), height - 19);
  });

  ctx.strokeStyle = "#8b948e";
  ctx.strokeRect(pad.left, pad.top, plotWidth, plotHeight);

  series.forEach((item) => {
    ctx.beginPath();
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = "round";
    rows.forEach((row, index) => index ? ctx.lineTo(x(index), y(row[item.key])) : ctx.moveTo(x(index), y(row[item.key])));
    ctx.stroke();

    if (periodYears === 1) {
      rows.forEach((row, index) => {
        ctx.beginPath();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.arc(x(index), y(row[item.key]), 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  });

  chartGeometry = { rows, x, pad, plotWidth };
}

function showTooltip(event) {
  if (!chartGeometry) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const { rows, x, pad, plotWidth } = chartGeometry;
  if (mouseX < pad.left || mouseX > pad.left + plotWidth) {
    tooltip.hidden = true;
    return;
  }
  let nearest = 0;
  let distance = Infinity;
  rows.forEach((_, index) => {
    const nextDistance = Math.abs(mouseX - x(index));
    if (nextDistance < distance) { distance = nextDistance; nearest = index; }
  });
  const row = rows[nearest];
  const lines = [`<strong>${rowLabel(row)}</strong>`];
  if (coffeeMode !== "robusta") lines.push(`아라비카 ${format(row.arabica)}`);
  if (coffeeMode !== "arabica") lines.push(`로부스타 ${format(row.robusta)}`);
  tooltip.innerHTML = lines.join("<br>");
  tooltip.style.left = `${x(nearest)}px`;
  tooltip.style.top = `${event.clientY - rect.top}px`;
  tooltip.hidden = false;
}

function downloadCsv() {
  const rows = filteredRows();
  const data = [
    ["기준월", "아라비카(US cents/lb)", "로부스타(US cents/lb)"],
    ...rows.map((row) => [
      row.period === "annual"
        ? row.date.slice(0, 4)
        : row.period === "latest"
          ? `${row.date.slice(0, 7)} 최신`
          : row.date.slice(0, 7),
      row.arabica,
      row.robusta,
    ]),
  ];
  const csv = data.map((line) => line.map((cell) => `"${cell}"`).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `coffee-price-index-${periodYears}y.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.querySelectorAll("[data-coffee]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-coffee]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    coffeeMode = button.dataset.coffee;
    render();
  });
});

document.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-period]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    periodYears = Number(button.dataset.period);
    render();
  });
});

document.querySelector("#refresh-data").addEventListener("click", loadData);
exchangeButton.addEventListener("click", updateExchangeRate);
document.querySelector("#download-csv").addEventListener("click", downloadCsv);
canvas.addEventListener("mousemove", showTooltip);
canvas.addEventListener("mouseleave", () => { tooltip.hidden = true; });
new ResizeObserver(resizeChart).observe(canvas);

loadData();
