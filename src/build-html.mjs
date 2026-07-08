import { readFileSync, writeFileSync } from "fs";

const graph = JSON.parse(readFileSync("./graph.json", "utf-8"));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Composio Tool Dependency Graph — GitHub &amp; Google Super</title>
<script src="https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js"></script>
<style>
  :root {
    --gh-color: #6e5494;
    --gs-color: #4285f4;
    --bg: #0f1117;
    --panel-bg: #171a22;
    --border: #2a2e3a;
    --text: #e6e8ef;
    --muted: #9aa1b0;
    --high: #3ddc84;
    --medium: #f5b942;
    --low: #7a7f8c;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); }
  #app { display: flex; height: 100vh; }
  #graph-wrapper { flex: 1; position: relative; }
  #graph { position: absolute; inset: 0; }
  #graph-title { position: absolute; top: 16px; left: 20px; z-index: 10; pointer-events: none; }
  #graph-title .main { font-size: 20px; font-weight: 700; color: var(--text); text-shadow: 0 1px 6px rgba(0,0,0,0.6); }
  #graph-title .sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; text-shadow: 0 1px 6px rgba(0,0,0,0.6); }
  #sidebar { width: 380px; border-left: 1px solid var(--border); background: var(--panel-bg); display: flex; flex-direction: column; overflow: hidden; }
  #sidebar-scroll { overflow-y: auto; padding: 16px; flex: 1; }
  h1 { font-size: 15px; margin: 0; padding: 14px 16px; border-bottom: 1px solid var(--border); }
  h1 small { display: block; color: var(--muted); font-weight: normal; margin-top: 4px; font-size: 12px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin: 0 0 8px; }
  .section { margin-bottom: 20px; }
  .stat-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
  .stat-row span:last-child { color: var(--muted); }
  label.chk { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 4px 0; cursor: pointer; }
  input[type="text"] { width: 100%; padding: 8px 10px; background: #0f1117; border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; }
  input[type="text"]:focus { outline: 1px solid var(--gs-color); }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; }
  .legend-line { width: 20px; height: 0; border-top: 3px solid; display: inline-block; margin-right: 6px; vertical-align: middle; }
  #detail { font-size: 13px; line-height: 1.5; }
  #detail .slug { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; padding: 6px 8px; background: #0f1117; border-radius: 6px; word-break: break-all; margin-bottom: 8px; display: inline-block; }
  #detail .desc { color: var(--muted); margin: 8px 0; }
  #detail .params span { display: inline-block; background: #232634; border-radius: 4px; padding: 2px 6px; margin: 2px 4px 2px 0; font-family: ui-monospace, monospace; font-size: 11px; }
  #detail .params span.req { border: 1px solid var(--high); }
  .edge-item { border-left: 3px solid var(--medium); padding: 6px 10px; margin: 6px 0; background: #1d2029; border-radius: 0 6px 6px 0; }
  .edge-item.high { border-color: var(--high); }
  .edge-item.low { border-color: var(--low); }
  .edge-item .tool { font-family: ui-monospace, monospace; font-size: 11.5px; cursor: pointer; color: #9fd3ff; }
  .edge-item .reason { color: var(--muted); font-size: 11.5px; margin-top: 2px; }
  .placeholder { color: var(--muted); font-size: 13px; }
  #search-results { max-height: 160px; overflow-y: auto; margin-top: 6px; }
  #search-results div { padding: 4px 6px; font-size: 12px; font-family: ui-monospace, monospace; cursor: pointer; border-radius: 4px; }
  #search-results div:hover { background: #232634; }
  hr { border: none; border-top: 1px solid var(--border); margin: 14px 0; }
</style>
</head>
<body>
<div id="app">
  <div id="graph-wrapper">
    <div id="graph-title">
      <div class="main">Composio Tool Dependency Graph</div>
      <div class="sub">GitHub &amp; Google Super &middot; ${graph.stats.totalNodes} tools &middot; ${graph.stats.totalEdges} dependency edges</div>
    </div>
    <div id="graph"></div>
  </div>
  <div id="sidebar">
    <h1>Composio Tool Dependency Graph
      <small>GitHub &amp; Google Super &middot; ${graph.stats.totalNodes} tools, ${graph.stats.totalEdges} dependency edges</small>
    </h1>
    <div id="sidebar-scroll">
      <div class="section">
        <h2>Legend</h2>
        <div><span class="legend-dot" style="background:var(--gh-color)"></span>GitHub tool</div>
        <div><span class="legend-dot" style="background:var(--gs-color)"></span>Google Super tool</div>
        <div style="margin-top:8px"><span class="legend-line" style="border-color:var(--high)"></span>high confidence</div>
        <div><span class="legend-line" style="border-color:var(--medium)"></span>medium confidence</div>
        <div><span class="legend-line" style="border-color:var(--low)"></span>low confidence</div>
        <div style="color:var(--muted);font-size:11px;margin-top:6px">Arrow points from the precursor tool to the tool that depends on it.</div>
      </div>

      <div class="section">
        <h2>Filters</h2>
        <label class="chk"><input type="checkbox" id="f-github" checked /> Show GitHub tools</label>
        <label class="chk"><input type="checkbox" id="f-googlesuper" checked /> Show Google Super tools</label>
        <label class="chk"><input type="checkbox" id="f-isolated" /> Show tools with no dependencies</label>
        <hr/>
        <label class="chk"><input type="checkbox" id="f-high" checked /> High confidence edges</label>
        <label class="chk"><input type="checkbox" id="f-medium" checked /> Medium confidence edges</label>
        <label class="chk"><input type="checkbox" id="f-low" checked /> Low confidence edges</label>
      </div>

      <div class="section">
        <h2>Search a tool</h2>
        <input type="text" id="search" placeholder="e.g. REPLY_TO_THREAD, CREATE_AN_ISSUE" />
        <div id="search-results"></div>
      </div>

      <div class="section">
        <h2>Stats</h2>
        <div class="stat-row"><span>GitHub tools</span><span>${graph.stats.githubNodes}</span></div>
        <div class="stat-row"><span>Google Super tools</span><span>${graph.stats.googlesuperNodes}</span></div>
        <div class="stat-row"><span>Total edges</span><span>${graph.stats.totalEdges}</span></div>
        <div class="stat-row"><span>Tools with ≥ 1 dependency link</span><span>${graph.stats.connectedNodes}</span></div>
        <div class="stat-row"><span>From doc text (auto-mined)</span><span>${(graph.stats.bySource.description||0) + (graph.stats.bySource.param_description||0)}</span></div>
        <div class="stat-row"><span>From curated param rules</span><span>${graph.stats.bySource.curated_rule||0}</span></div>
        <div class="stat-row"><span>From semantic resolution</span><span>${graph.stats.bySource.semantic_resolution||0}</span></div>
      </div>

      <hr/>
      <h2>Selected tool</h2>
      <div id="detail"><div class="placeholder">Click a node in the graph, or search above, to see its details, precursor tools, and what it unlocks.</div></div>
    </div>
  </div>
</div>

<script>
const GRAPH = ${JSON.stringify(graph)};

const nodesById = new Map(GRAPH.nodes.map(n => [n.id, n]));
const edgesByTo = new Map();
const edgesByFrom = new Map();
for (const e of GRAPH.edges) {
  if (!edgesByTo.has(e.to)) edgesByTo.set(e.to, []);
  edgesByTo.get(e.to).push(e);
  if (!edgesByFrom.has(e.from)) edgesByFrom.set(e.from, []);
  edgesByFrom.get(e.from).push(e);
}

const colorFor = (toolkit) => toolkit === 'github' ? '#6e5494' : '#4285f4';
const confColor = { high: '#3ddc84', medium: '#f5b942', low: '#7a7f8c' };

function shortLabel(slug, toolkit) {
  const prefix = toolkit === 'github' ? 'GITHUB_' : 'GOOGLESUPER_';
  return slug.startsWith(prefix) ? slug.slice(prefix.length) : slug;
}

const allNodeData = GRAPH.nodes.map(n => ({
  id: n.id,
  label: shortLabel(n.id, n.toolkit),
  title: n.id,
  toolkit: n.toolkit,
  color: { background: colorFor(n.toolkit), border: '#00000055' },
  font: { color: '#e6e8ef', size: 11 },
  shape: 'dot',
  size: 8,
}));

const allEdgeData = GRAPH.edges.map((e, i) => ({
  id: i,
  from: e.from,
  to: e.to,
  arrows: 'to',
  color: { color: confColor[e.confidence] || '#888', opacity: 0.55 },
  dashes: e.confidence === 'low' ? [2,3] : (e.confidence === 'medium' ? [6,4] : false),
  width: e.confidence === 'high' ? 3.2 : (e.confidence === 'medium' ? 2.4 : 1.8),
  confidence: e.confidence,
  param: e.param,
}));

const nodesDataSet = new vis.DataSet(allNodeData);
const edgesDataSet = new vis.DataSet(allEdgeData);

const container = document.getElementById('graph');
const network = new vis.Network(container, { nodes: nodesDataSet, edges: edgesDataSet }, {
  physics: {
    solver: 'forceAtlas2Based',
    forceAtlas2Based: { gravitationalConstant: -60, springLength: 90, springConstant: 0.06, avoidOverlap: 0.4, damping: 0.6 },
    stabilization: { iterations: 500, updateInterval: 25 },
    adaptiveTimestep: true,
    minVelocity: 0.75,
  },
  interaction: { hover: true, tooltipDelay: 150 },
  nodes: { borderWidth: 1 },
  edges: { smooth: { type: 'continuous', roundness: 0.3 } },
});

// Large hub nodes (e.g. GITHUB_SEARCH_USERS, GITHUB_GET_THE_AUTHENTICATED_USER) can
// oscillate forever under force-directed physics instead of settling. Once the initial
// layout has stabilized, freeze physics entirely so the graph stops jittering; dragging
// a node still moves it, it just won't keep re-simulating forces on release.
network.once('stabilizationIterationsDone', () => {
  network.setOptions({ physics: false });
});
network.on('dragStart', () => {
  network.setOptions({ physics: { enabled: true, minVelocity: 0.75 } });
});
network.on('dragEnd', () => {
  setTimeout(() => network.setOptions({ physics: false }), 800);
});

const connected = new Set();
GRAPH.edges.forEach(e => { connected.add(e.from); connected.add(e.to); });

function applyFilters() {
  const showGithub = document.getElementById('f-github').checked;
  const showGooglesuper = document.getElementById('f-googlesuper').checked;
  const showIsolated = document.getElementById('f-isolated').checked;
  const confOk = {
    high: document.getElementById('f-high').checked,
    medium: document.getElementById('f-medium').checked,
    low: document.getElementById('f-low').checked,
  };

  const visibleNodeIds = new Set();
  nodesDataSet.forEach(n => {
    const toolkitOk = (n.toolkit === 'github' && showGithub) || (n.toolkit === 'googlesuper' && showGooglesuper);
    const isolatedOk = showIsolated || connected.has(n.id);
    const visible = toolkitOk && isolatedOk;
    nodesDataSet.update({ id: n.id, hidden: !visible });
    if (visible) visibleNodeIds.add(n.id);
  });

  edgesDataSet.forEach(e => {
    const visible = confOk[e.confidence] && visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to);
    edgesDataSet.update({ id: e.id, hidden: !visible });
  });
}

['f-github','f-googlesuper','f-isolated','f-high','f-medium','f-low'].forEach(id => {
  document.getElementById(id).addEventListener('change', applyFilters);
});
applyFilters();

function renderDetail(slug) {
  const node = nodesById.get(slug);
  if (!node) return;
  const incoming = edgesByTo.get(slug) || [];
  const outgoing = edgesByFrom.get(slug) || [];

  const paramHtml = (params, requiredSet) => params.map(p =>
    \`<span class="\${requiredSet.has(p) ? 'req' : ''}">\${p}</span>\`
  ).join('');
  const reqSet = new Set(node.requiredParams);

  const edgeList = (edges, dir) => edges.map(e => {
    const other = dir === 'in' ? e.from : e.to;
    const otherNode = nodesById.get(other);
    const label = dir === 'in'
      ? \`precursor for <b>\${e.param || 'related'}</b>\`
      : \`this supplies <b>\${e.param || 'related'}</b>\`;
    return \`<div class="edge-item \${e.confidence}">
      <div class="tool" data-nav="\${other}">\${shortLabel(other, otherNode ? otherNode.toolkit : '')}</div>
      <div class="reason">\${label} &middot; \${e.confidence} confidence<br/>\${e.reason}</div>
    </div>\`;
  }).join('') || '<div class="placeholder">none found</div>';

  document.getElementById('detail').innerHTML = \`
    <div class="slug">\${node.id}</div>
    <div><b>\${node.name}</b></div>
    <div class="desc">\${node.description}</div>
    <div class="params"><b style="font-size:11px;color:var(--muted)">REQUIRED</b><br/>\${paramHtml(node.requiredParams, reqSet) || '<span class="placeholder">none</span>'}</div>
    <div class="params" style="margin-top:6px"><b style="font-size:11px;color:var(--muted)">OPTIONAL</b><br/>\${paramHtml(node.optionalParams, reqSet) || '<span class="placeholder">none</span>'}</div>
    <hr/>
    <h2>Needs first (precursors)</h2>
    \${edgeList(incoming, 'in')}
    <h2>Unlocks / feeds into</h2>
    \${edgeList(outgoing, 'out')}
  \`;

  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-nav');
      network.selectNodes([target]);
      network.focus(target, { scale: 1.2, animation: true });
      renderDetail(target);
    });
  });
}

network.on('click', (params) => {
  if (params.nodes.length > 0) {
    renderDetail(params.nodes[0]);
  }
});

const searchBox = document.getElementById('search');
const searchResults = document.getElementById('search-results');
searchBox.addEventListener('input', () => {
  const q = searchBox.value.trim().toUpperCase();
  searchResults.innerHTML = '';
  if (!q) return;
  const matches = GRAPH.nodes.filter(n => n.id.includes(q)).slice(0, 25);
  matches.forEach(n => {
    const div = document.createElement('div');
    div.textContent = n.id;
    div.addEventListener('click', () => {
      network.selectNodes([n.id]);
      network.focus(n.id, { scale: 1.3, animation: true });
      renderDetail(n.id);
    });
    searchResults.appendChild(div);
  });
});
</script>
</body>
</html>
`;

writeFileSync("./graph.html", html, "utf-8");
console.log("wrote graph.html");
