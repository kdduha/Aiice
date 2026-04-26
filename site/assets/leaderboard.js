async function loadLeaderboard() {
  const root = document.getElementById("leaderboard-app");
  if (!root) return;

  const raw = await fetch("../assets/leaderboard.csv").then(r => r.text());
  const rows = parseCSV(raw);

  const seas = unique(rows, "sea");
  const metrics = unique(rows, "metric");
  const models = unique(rows, "model");

  const state = {
    sea: seas[0],
    metric: metrics[0],
  };

  root.innerHTML = renderLayout(seas, metrics);

  bind(state, rows, models);
  render(state, rows, models);
}

function renderLayout(seas, metrics) {
  return `
    <div class="lb-controls">
      <select id="sea-select">
        ${seas.map(s => `<option>${s}</option>`).join("")}
      </select>

      <select id="metric-select">
        ${metrics.map(m => `<option>${m}</option>`).join("")}
      </select>
    </div>

    <div id="stats"></div>
    <div id="ranking"></div>

    <canvas id="radar"></canvas>
  `;
}

function bind(state, rows, models) {
  document.getElementById("sea-select").onchange = e => {
    state.sea = e.target.value;
    render(state, rows, models);
  };

  document.getElementById("metric-select").onchange = e => {
    state.metric = e.target.value;
    render(state, rows, models);
  };
}

function render(state, rows, models) {
  const filtered = rows.filter(r =>
    r.sea === state.sea && r.metric === state.metric
  );

  const sorted = sort(filtered, state.metric);

  renderStats(sorted);
  renderTable(sorted);
  renderRadar(rows, state, models);
}

function renderStats(sorted) {
  const vals = sorted.map(x => x.value);

  const mean = avg(vals);
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  document.getElementById("stats").innerHTML = `
    <div class="cards">
      <div class="card">
        Best
        <div class="big">${sorted[0].model}</div>
      </div>

      <div class="card">
        Mean
        <div class="big">${mean.toFixed(4)}</div>
      </div>

      <div class="card">
        Min
        <div class="big">${min.toFixed(4)}</div>
      </div>

      <div class="card">
        Max
        <div class="big">${max.toFixed(4)}</div>
      </div>
    </div>
  `;
}

function renderTable(sorted) {
  document.getElementById("ranking").innerHTML = `
    <table>

      <colgroup>
        <col style="width: 10%">
        <col style="width: 70%">
        <col style="width: 20%">
      </colgroup>

      <tr>
        <th>#</th>
        <th>Model</th>
        <th>Value</th>
      </tr>

      ${sorted.map((r, i) => {
        const bestClass = i === 0 ? "best" : "";

        return `
          <tr>
            <td class="${bestClass}">
              ${i + 1}
            </td>
            <td class="${bestClass}">
              ${r.model}
            </td>
            <td class="${bestClass}">
              ${r.value.toFixed(6)}
            </td>
          </tr>
        `;
      }).join("")}

    </table>
  `;
}

function renderRadar(rows, state, models) {
  const canvas = document.getElementById("radar");
  const ctx = canvas.getContext("2d");

  if (window.radarChart) window.radarChart.destroy();

  const metrics = unique(rows, "metric");
  const normalized = normalize(rows);

  const datasets = models.map(model => {
    const data = metrics.map(metric => {
      const r = normalized.find(x =>
        x.model === model &&
        x.sea === state.sea &&
        x.metric === metric
      );
      return r ? r.norm : 0;
    });

    return {
      label: model,
      data
    };
  });

  window.radarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels: metrics,
      datasets
    },
    options: {
      scales: {
        r: {
          min: 0,
          max: 1
        }
      }
    }
  });
}

function normalize(rows) {
  const values = rows.map(r => r.value);

  const min = Math.min(...values);
  const max = Math.max(...values);

  const lowerBetter = new Set(["mae", "mse", "rmse"]);

  return rows.map(r => {
    let v = (r.value - min) / (max - min + 1e-9);

    if (lowerBetter.has(r.metric)) {
      v = 1 - v;
    }

    return { ...r, norm: v };
  });
}

function sort(data, metric) {
  const lowerBetter = new Set(["mae", "mse", "rmse"]);

  return [...data].sort((a, b) =>
    lowerBetter.has(metric)
      ? a.value - b.value
      : b.value - a.value
  );
}

function unique(arr, key) {
  return [...new Set(arr.map(x => x[key]))];
}

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function parseCSV(csv) {
  return csv.trim().split("\n").slice(1).map(line => {
    const [model, sea, metric, value] = line.split(",");
    return { model, sea, metric, value: +value };
  });
}

function loadChart() {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/chart.js";

  script.onload = () => {
    const font = getComputedStyle(document.documentElement)
      .getPropertyValue("--md-text-font")
      .trim() || "sans-serif";

    Chart.defaults.font.family = font;

    loadLeaderboard();
  };

  document.head.appendChild(script);
}
document.addEventListener("DOMContentLoaded", loadChart);
