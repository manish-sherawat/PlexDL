'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const api = window.downloader;
const progressMode = new URLSearchParams(location.search).get('progress');
const integrationMode = new URLSearchParams(location.search).get('integration') === '1';
const optionsMode = new URLSearchParams(location.search).get('options') === '1';
const addMode = new URLSearchParams(location.search).get('add') === '1';
const schedulerMode = new URLSearchParams(location.search).get('scheduler') === '1';
if (progressMode) document.body.classList.add('progress-window');
if (integrationMode) document.body.classList.add('integration-window');
if (optionsMode) document.body.classList.add('options-window');
if (addMode) document.body.classList.add('add-window');
if (schedulerMode) document.body.classList.add('scheduler-window');
if (integrationMode) document.title = 'Browser integration';
if (optionsMode) document.title = 'Options';
if (addMode) document.title = 'Download File Info';
if (schedulerMode) document.title = 'Scheduler';
let state = { downloads: [], settings: {}, integration: {}, fileIcons: {} }, selectedId = null, selectionAnchorId = null, detailId = progressMode || null, filter = 'all', category = '', searchTerm = '', sort = 'createdAt', ascending = false, visibleDownloads = [], toastTimer, unsubscribe, unsubscribeCommands;
const selectedIds = new Set();
const pending = new Set();
let pendingReviewId = null;
let selectionDrag = null, suppressRowClick = false;
const dismissedReviews = new Set();
const iconPaths = {
  add: ['M12 5v14M5 12h14'],
  resume: ['M7 5l12 7-12 7V5z'],
  stop: ['M6 5h4v14H6z', 'M14 5h4v14h-4z'],
  stopall: ['M6 6h12v12H6z'],
  delete: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12', 'M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3'],
  clear: ['M4 7h16', 'M9 12l2 2 4-4', 'M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12'],
  options: ['M4 6h16', 'M4 12h16', 'M4 18h16', 'M8 4v4', 'M16 10v4', 'M10 16v4'],
  clock: ['M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z', 'M12 7v5l3 2'],
  startqueue: ['M4 5l7 7-7 7V5z', 'M12 5l7 7-7 7V5z'],
  stopqueue: ['M6 5h4v14H6z', 'M14 5h4v14h-4z'],
  browser: ['M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z', 'M2 12h20', 'M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10', 'M12 2a15 15 0 0 0-4 10 15 15 0 0 0 4 10'],
  theme: ['M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18V4a8 8 0 0 1 0 16z'],
  sidebar: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M9 4v16']
};
function applyTheme(theme) {
  let resolved = theme;
  if (!theme || theme === 'system') {
    resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolved === 'dark' ? 'dark' : 'light');
  try { localStorage.setItem('theme', theme || 'light'); } catch { }
  const themeBtn = $('#theme-toggle');
  if (themeBtn) {
    themeBtn.title = resolved === 'dark' ? 'Switch to Light Theme (Alt+T)' : 'Switch to Dark Theme (Alt+T)';
    const label = $('span', themeBtn);
    if (label) label.textContent = resolved === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
  if ($('#theme-select')) $('#theme-select').value = theme || 'light';
}
try { applyTheme(localStorage.getItem('theme') || 'light'); } catch { }
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((state.settings.theme || localStorage.getItem('theme')) === 'system') {
      applyTheme('system');
    }
  });
}
for (const button of $$('[data-icon]')) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  for (const data of iconPaths[button.dataset.icon] || []) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', data);
    svg.append(path);
  }
  button.prepend(svg);
}
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
const rememberLabel = element('label', 'checkbox-label'); const rememberInput = element('input'); rememberInput.type = 'checkbox'; rememberInput.id = 'remember-category-path'; rememberInput.disabled = true; rememberLabel.append(rememberInput, document.createTextNode('Remember this folder for the selected category'));
$('#add-directory').closest('.form-line').after(rememberLabel);
let integrationBrowsers = [], selectedBrowserName = null, setupPolling = false;
const browserStatus = browser => browser.connected ? ['Connected', 'connected'] : !browser.installed ? ['Not installed', 'missing'] : browser.setupState === 'approval' ? ['Enable extension', 'setup'] : browser.setupState === 'disabled' ? ['Disabled', 'setup'] : browser.setupState === 'removed' ? ['Reinstall needed', 'setup'] : ['Setup needed', 'setup'];
const storeFallback = element('button', 'button', 'Install from Web Store'); storeFallback.type = 'button'; storeFallback.id = 'browser-store-action';
$('#browser-primary-action').after(storeFallback);
storeFallback.addEventListener('click', () => runBrowserSetup('store'));
function browserIcon(browser, className = '') {
  const frame = element('span', `browser-icon-frame ${className}`.trim());
  if (browser.icon) { const image = element('img'); image.src = browser.icon; image.alt = ''; frame.append(image); }
  else frame.append(element('span', 'browser-monogram', browser.name.slice(0, 1)));
  return frame;
}
function renderBrowserGrid(info) {
  integrationBrowsers = Array.isArray(info.browsers) ? info.browsers.filter(browser => browser.installed || browser.connected) : [];
  const grid = $('#browser-grid'); grid.replaceChildren();
  for (const browser of integrationBrowsers) {
    const [label, tone] = browserStatus(browser), card = element('button', 'browser-card');
    card.type = 'button'; card.setAttribute('role', 'listitem'); card.dataset.browser = browser.name;
    const copy = element('span', 'browser-card-copy');
    const subtitle = browser.connected ? `Connected in ${browser.profiles || 1} profile${browser.profiles === 1 ? '' : 's'}` : browser.setupState === 'approval' ? 'Downloaded; waiting for your approval' : browser.setupState === 'disabled' ? 'Enable it in your browser' : browser.setupState === 'removed' ? 'Previously removed from this browser' : 'Extension not detected';
    copy.append(element('strong', '', browser.name), element('span', 'browser-card-subtitle', subtitle));
    const status = element('span', `browser-status ${tone}`, label);
    card.append(browserIcon(browser), copy, status);
    card.addEventListener('click', () => showBrowserDetail(browser.name));
    grid.append(card);
  }
  const connected = integrationBrowsers.filter(browser => browser.connected).length;
  $('#browser-connection-summary').textContent = info.connectionError ? `Setup check failed: ${info.connectionError}` : `${connected} browser${connected === 1 ? '' : 's'} connected`;
  if (selectedBrowserName && integrationBrowsers.some(browser => browser.name === selectedBrowserName)) showBrowserDetail(selectedBrowserName);
}
function showBrowserDetail(name) {
  const browser = integrationBrowsers.find(item => item.name === name); if (!browser) return;
  selectedBrowserName = name; $('#browser-grid').hidden = true; $('#browser-detail').hidden = false;
  const icon = $('#browser-detail-icon'); icon.replaceChildren(...browserIcon(browser).childNodes);
  $('#browser-detail-name').textContent = browser.name;
  const [label, tone] = browserStatus(browser); $('#browser-detail-status').textContent = label; $('#browser-detail-status').className = `browser-detail-status ${tone}`;
  $('#extension-path').value = browser.extensionPath || '';
  const primary = $('#browser-primary-action'); primary.disabled = !browser.installed; primary.dataset.browser = browser.name;
  const enableExisting = ['approval', 'disabled'].includes(browser.setupState);
  primary.dataset.action = browser.storeUrl && !enableExisting && !browser.connected ? 'store' : browser.name === 'Firefox' ? 'prepare' : 'open';
  primary.textContent = primary.dataset.action === 'store' ? (browser.setupState === 'removed' ? 'Reinstall extension' : 'Install browser extension') : `Open ${browser.name}`;
  storeFallback.hidden = !browser.storeUrl || primary.dataset.action === 'store';
  $('#browser-detail-summary').textContent = browser.connected ? 'The extension and desktop connector are ready. Refresh an existing video tab if its download button is missing.' : browser.setupState === 'removed' ? `${browser.name} remembers an earlier removal and will not add this extension automatically. Reinstall it from the official store to reconnect.` : browser.setupState === 'approval' ? `${browser.name} has downloaded the extension. Enable it in the browser to finish setup.` : browser.setupState === 'disabled' ? `The extension is installed but disabled. Enable it in ${browser.name} to reconnect.` : 'Complete this one-time setup for this browser. If you just installed the app, fully close and reopen this browser to see its extension approval prompt.';
  const steps = $('#browser-steps'); steps.replaceChildren();
  const texts = browser.storeUrl && (enableExisting || browser.connected) ? [
    `Click Open ${browser.name}. Use the browser's Action required menu to enable Awesome Downloader Integration if that prompt is shown.`,
    `Otherwise, enter ${browser.extensionPage} in the address bar and enable Awesome Downloader Integration.`,
    'Return here and click Refresh, then reload your video page. If the extension is missing, use Install from Web Store.'
  ] : browser.storeUrl ? [
    `Click ${browser.setupState === 'removed' ? 'Reinstall extension' : 'Install browser extension'} to open the official Chrome Web Store listing in this browser.`,
    'Click Add to Chrome (or the equivalent button in your browser), then confirm the installation.',
    'The desktop connector is prepared automatically. Return here and click Refresh, then reload your video page.'
  ] : browser.name === 'Firefox' ? [
    'Click Open Firefox. Awesome Downloader prepares the Firefox extension, registers its local connector, and opens Firefox.',
    `Enter ${browser.extensionPage} in Firefox's address bar.`,
    'On the Firefox page, select This Firefox, then Load Temporary Add-on.',
    'Choose manifest.json inside the extension folder shown below.',
    'Return here, click Refresh, then reload your video page.'
  ] : [
    `Click Open ${browser.name}.`,
    `Enter ${browser.extensionPage} in ${browser.name}'s address bar.`,
    'Turn on Developer mode on the Extensions page.',
    'Choose Load unpacked. In the Windows folder picker, paste the extension folder path shown below into the address bar.',
    'Select the extension folder itself, then return here and click Refresh.',
    'Reload your video page. The Download this video button should appear when playable media is detected.'
  ];
  for (const text of texts) steps.append(element('li', '', text));
  document.querySelector('.extension-path-label').hidden = Boolean(browser.storeUrl);
  document.querySelector('.extension-path-row').hidden = Boolean(browser.storeUrl);
  $('#automatic-setup-copy').textContent = browser.storeUrl ? 'Awesome Downloader prepares its connector automatically. Your browser asks you to confirm adding the published extension.' : browser.name === 'Firefox' ? 'Firefox requires a signed add-on for permanent installation. Until the add-on is published, Firefox asks you to load the included extension again after restarting the browser.' : 'Use the included extension folder for this browser.';
}
async function runBrowserSetup(action, browserName = selectedBrowserName) {
  const error = $('#browser-setup-error'); error.hidden = true;
  try {
    if (!browserName) throw new Error('Choose a browser first.');
    if (action === 'prepare') {
      const prepared = await call('browserSetup', { action: 'prepare', browser: browserName });
      if (prepared?.extensionPath) $('#extension-path').value = prepared.extensionPath;
      await call('browserSetup', { action: 'open', browser: browserName });
    } else await call('browserSetup', { action, browser: browserName });
    if (action === 'copy') notify('Extension folder path copied.');
  } catch (problem) { error.textContent = messageOf(problem); error.hidden = false; }
}
$('#browser-back').addEventListener('click', () => { selectedBrowserName = null; $('#browser-detail').hidden = true; $('#browser-grid').hidden = false; });
$('#browser-refresh').addEventListener('click', () => refreshIntegrationInfo(true));
$('#browser-primary-action').addEventListener('click', event => runBrowserSetup(event.currentTarget.dataset.action, event.currentTarget.dataset.browser));
$('#copy-extension-path').addEventListener('click', () => runBrowserSetup('copy'));
$('#show-extension-folder').addEventListener('click', () => runBrowserSetup('folder'));
async function refreshIntegrationInfo(showErrors = false) {
  if (setupPolling) return; setupPolling = true;
  try { const info = await call('integration') || state.integration; state.integration = info; renderBrowserGrid(info); }
  catch (problem) { if (showErrors) { $('#browser-setup-error').textContent = messageOf(problem); $('#browser-setup-error').hidden = false; } }
  finally { setupPolling = false; }
}
const setupPoll = setInterval(() => { if (integrationMode) refreshIntegrationInfo(); }, 3000);
window.addEventListener('beforeunload', () => clearInterval(setupPoll));
const completionActions = element('div', 'transfer-buttons'); completionActions.id = 'download-complete-actions'; completionActions.hidden = true;
for (const [label, action] of [['Open', 'open'], ['Open with…', 'openWith'], ['Open folder', 'reveal'], ['Close', 'close']]) { const button = element('button', action === 'open' ? 'button primary' : 'button', label); button.type = 'button'; button.addEventListener('click', () => action === 'close' ? $('#details-dialog').close() : performAction(detailDownload(), action)); completionActions.append(button); }
const completedPanel = element('section', 'completed-panel');
const completedSummary = element('div', 'completed-summary');
completedPanel.append(completedSummary);
const completedFields = {};
for (const [key, label] of [['url', 'Address'], ['path', 'The file saved as']]) {
  const fieldLabel = element('label', 'completed-field', label), input = element('input');
  input.readOnly = true; input.setAttribute('aria-label', label); fieldLabel.append(input); completedPanel.append(fieldLabel); completedFields[key] = input;
}
completedPanel.append(completionActions);
const suppressLabel = element('label', 'checkbox-label'), suppressCompletion = element('input'); suppressCompletion.type = 'checkbox';
suppressLabel.append(suppressCompletion, document.createTextNode("Don't show this dialog again")); completedPanel.append(suppressLabel);
suppressCompletion.addEventListener('change', async () => { try { await call('settings', { hideCompletionDialog: suppressCompletion.checked }); } catch (error) { suppressCompletion.checked = !suppressCompletion.checked; notify(messageOf(error), true); } });
$('#details-dialog').append(completedPanel);
const renderTransferDetails = renderDetails;
renderDetails = function () {
  renderTransferDetails(); const d = detailDownload(); if (!d || statusOf(d) !== 'completed') return;
  const wrap = element('div', 'completed-text-wrap');
  wrap.append(element('div', 'completed-headline', 'Download complete'), element('div', 'completed-subline', `Downloaded ${bytes(d.total || d.downloaded)} • ${Math.round(d.total || d.downloaded || 0).toLocaleString()} bytes verified`));
  const iconSpan = element('span', 'completed-icon');
  iconSpan.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  completedSummary.replaceChildren(iconSpan, wrap);
  completedFields.url.value = d.url || ''; completedFields.path.value = d.path || '';
  suppressCompletion.checked = state.settings.hideCompletionDialog === true;
};
function numeric(value) { const result = Number(value); return Number.isFinite(result) && result > 0 ? result : 0; }
function statusOf(d) { const value = String(d.status || 'queued').toLowerCase(); return ({ active: 'downloading', running: 'downloading', probing: 'connecting', complete: 'completed', done: 'completed', error: 'failed', canceled: 'cancelled', pending: 'queued' })[value] || value; }
const statusNames = { completed: 'Complete', downloading: 'Receiving data…', connecting: 'Connecting…', probing: 'Connecting…', paused: 'Stopped', queued: 'Queued', scheduled: 'Scheduled', failed: 'Error', cancelled: 'Cancelled', assembling: 'Finalizing…' };
function categoryOf(d) { const value = String(d.category || '').toLowerCase(); if (/image|photo|picture/.test(value)) return 'Images'; if (/video/.test(value)) return 'Video'; if (/audio|music/.test(value)) return 'Audio'; if (/doc|text/.test(value)) return 'Documents'; if (/arch|compress/.test(value)) return 'Archives'; if (/program/.test(value)) return 'Programs'; return 'Other'; }
function bytes(value) { const size = numeric(value); if (!size) return '0 B'; const power = Math.min(4, Math.floor(Math.log(size) / Math.log(1024))); return `${(size / 1024 ** power).toFixed(power ? 2 : 0)} ${['B', 'KB', 'MB', 'GB', 'TB'][power]}`; }
function date(value) { if (!value) return ''; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }); }
function timeLeft(d) { const total = numeric(d.total) || numeric(d.streamProgress?.estimatedBytes); if (!total || !numeric(d.speed)) return ''; const seconds = Math.max(0, Math.ceil((total - numeric(d.downloaded)) / numeric(d.speed))); return ((!d.total || d.estimated) ? '≈ ' : '') + duration(seconds); }
function sizeLabel(d) { return numeric(d.total) ? (d.estimated ? '≈ ' : '') + bytes(d.total) : d.streamProgress?.estimatedBytes ? '≈ ' + bytes(d.streamProgress.estimatedBytes) : d.kind === 'hls' ? 'Calculating from segments…' : 'Not supplied by server'; }
function duration(seconds) { return seconds < 60 ? `${Math.ceil(seconds)} sec` : seconds < 3600 ? `${Math.ceil(seconds / 60)} min` : `${Math.floor(seconds / 3600)} hr ${Math.floor(seconds % 3600 / 60)} min`; }
function percentage(d) { return statusOf(d) === 'completed' ? 100 : numeric(d.total) ? Math.min(100, numeric(d.downloaded) / numeric(d.total) * 100) : d.streamProgress?.total ? d.streamProgress.completed / d.streamProgress.total * 100 : null; }
function messageOf(error) { return error?.message || String(error || 'The operation failed.'); }
function notify(message, error = false) { clearTimeout(toastTimer); $('#toast-text').textContent = message; $('#toast').dataset.error = String(error); $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, error ? 14000 : 7000); }
async function call(method, ...args) { if (!api || typeof api[method] !== 'function') throw new Error('The download service is unavailable. Restart Awesome Downloader.'); const result = await api[method](...args); if (result?.error && !result.downloads) throw new Error(typeof result.error === 'string' ? result.error : result.error.message || 'The request failed.'); return result; }
function acceptSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.downloads)) return;
  state = { downloads: snapshot.downloads, settings: snapshot.settings || state.settings, integration: snapshot.integration || state.integration, fileIcons: snapshot.fileIcons || state.fileIcons };
  if (snapshot.settings?.theme) applyTheme(snapshot.settings.theme);
  const valid = new Set(state.downloads.map(d => d.id)); for (const id of selectedIds) if (!valid.has(id)) selectedIds.delete(id); if (!valid.has(selectedId)) selectedId = selectedIds.values().next().value || null; if (!valid.has(selectionAnchorId)) selectionAnchorId = selectedId; $('#download-list').setAttribute('aria-busy', 'false'); $('#connection-label').textContent = 'Connected'; render(); if (!$$('dialog[open]').length) { const review = progressMode && state.downloads.find(d => d.id === progressMode && d.needsReview && !dismissedReviews.has(d.id)); if (review) openReview(review.id); }
}
async function refresh() { acceptSnapshot(await call('snapshot')); }
function selected() { return state.downloads.find(d => d.id === selectedId); }
function canResume(d) { return d && !d.needsReview && ['paused', 'queued', 'scheduled', 'failed', 'cancelled'].includes(statusOf(d)); }
function canPause(d) { return d && !d.needsReview && ['downloading', 'connecting', 'queued', 'scheduled', 'assembling'].includes(statusOf(d)); }
function matches(d) { const status = statusOf(d); if (filter === 'completed' && status !== 'completed') return false; if (filter === 'unfinished' && status === 'completed') return false; if (filter === 'queued' && !['queued', 'scheduled', 'paused'].includes(status)) return false; if (category && categoryOf(d) !== category) return false; return !searchTerm || `${d.filename || ''} ${d.url || ''}`.toLowerCase().includes(searchTerm); }
function paintSelection() { $$('.download-row').forEach(row => { const active = selectedIds.has(row.dataset.id); row.classList.toggle('selected', active); row.setAttribute('aria-selected', String(active)); }); updateControls(); }
function selectDownload(id, { additive = false, toggle = false, range = false } = {}) {
  if (!id) { selectedIds.clear(); selectedId = null; selectionAnchorId = null; paintSelection(); return; }
  if (range) {
    const targetIndex = visibleDownloads.findIndex(download => download.id === id);
    let anchorIndex = visibleDownloads.findIndex(download => download.id === selectionAnchorId);
    if (anchorIndex < 0) anchorIndex = visibleDownloads.findIndex(download => download.id === selectedId);
    if (anchorIndex < 0) anchorIndex = targetIndex;
    if (!additive) selectedIds.clear();
    const start = Math.min(anchorIndex, targetIndex), end = Math.max(anchorIndex, targetIndex);
    for (let index = start; index <= end; index++)if (visibleDownloads[index]) selectedIds.add(visibleDownloads[index].id);
    if (!selectionAnchorId) selectionAnchorId = visibleDownloads[anchorIndex]?.id || id;
  } else {
    if (!additive) selectedIds.clear();
    if (toggle && selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
    selectionAnchorId = id;
  }
  selectedId = selectedIds.has(id) ? id : (selectedIds.values().next().value || null);
  paintSelection();
}
function rowFor(d) {
  const status = statusOf(d), percent = percentage(d);
  const row = element('tr', 'download-row');
  row.dataset.id = d.id;
  row.dataset.status = status;
  row.classList.toggle('selected', selectedIds.has(d.id));
  row.setAttribute('aria-selected', String(selectedIds.has(d.id)));
  const nameCell = element('td');
  nameCell.title = d.filename || d.url;
  const name = element('span', 'file-name');
  const extension = (String(d.filename || d.path || '').match(/\.[a-z0-9]{1,12}$/i)?.[0] || '').toLowerCase(), nativeIcon = state.fileIcons?.[extension];
  if (nativeIcon) {
    const icon = element('img', 'file-type-icon native-file-icon');
    icon.src = nativeIcon;
    icon.alt = '';
    name.append(icon);
  } else {
    name.append(element('span', 'file-type-icon file-type-fallback', ''));
  }
  const textWrap = element('span', 'file-title-wrap');
  textWrap.append(element('span', 'file-title-primary', d.filename || 'Preparing file…'));
  let domain = '';
  try { if (d.url) domain = new URL(d.url).hostname.replace(/^www\./, ''); } catch { }
  if (domain) textWrap.append(element('span', 'file-domain-sub', domain));
  name.append(textWrap);
  nameCell.append(name);
  const names = { completed: 'Complete', downloading: percent === null ? 'Receiving data…' : `${percent.toFixed(2)}%`, connecting: 'Connecting…', assembling: 'Finalizing…', queued: 'Queued', scheduled: 'Scheduled', paused: 'Stopped', cancelled: 'Cancelled', failed: 'Error' };
  const statusCell = element('td', 'status-cell');
  const statusBadge = element('span', `row-status ${status}`);
  if (status === 'downloading' && percent !== null) {
    const miniTrack = element('span', 'mini-gh-track');
    const filled5 = Math.min(5, Math.max(0, Math.floor(percent / 20)));
    for (let k = 0; k < 5; k++) {
      const box = element('span', `mini-gh-box ${k < filled5 ? 'level-4' : k === filled5 ? 'level-2 is-active' : 'level-0'}`);
      miniTrack.append(box);
    }
    statusBadge.append(miniTrack, document.createTextNode(names[status] || status));
  } else if (status === 'completed') {
    const miniTrack = element('span', 'mini-gh-track');
    for (let k = 0; k < 5; k++) {
      const box = element('span', 'mini-gh-box level-4');
      miniTrack.append(box);
    }
    statusBadge.append(miniTrack, document.createTextNode(names[status] || status));
  } else {
    statusBadge.textContent = names[status] || status;
  }
  statusCell.append(statusBadge);
  statusCell.title = d.error || names[status] || status;
  const description = d.description || d.error || d.notice || (d.scheduledAt && status === 'scheduled' ? `Starts ${date(d.scheduledAt)}` : '');
  const descriptionCell = element('td', '', description);
  descriptionCell.title = description;
  row.append(
    nameCell,
    element('td', 'cell-queue', ['queued', 'scheduled', 'paused'].includes(status) ? '✓' : ''),
    element('td', 'cell-size tabular-cell', sizeLabel(d)),
    statusCell,
    element('td', 'cell-time tabular-cell', status === 'downloading' ? timeLeft(d) : ''),
    element('td', 'cell-rate tabular-cell', status === 'downloading' ? `${bytes(d.speed)}/sec` : ''),
    element('td', 'cell-date tabular-cell', date(d.lastTry || d.createdAt)),
    descriptionCell
  );
  row.addEventListener('click', event => {
    if (suppressRowClick) return;
    const additive = event.ctrlKey || event.metaKey;
    selectDownload(d.id, { additive, range: event.shiftKey, toggle: additive && !event.shiftKey });
  });
  row.addEventListener('dblclick', () => showDetails(d.id));
  row.addEventListener('contextmenu', event => {
    event.preventDefault();
    selectDownload(d.id);
    showDetails(d.id);
  });
  return row;
}
function updateCategoryBadges() {
  const counts = {
    all: state.downloads.length,
    unfinished: state.downloads.filter(d => statusOf(d) !== 'completed').length,
    completed: state.downloads.filter(d => statusOf(d) === 'completed').length,
    queued: state.downloads.filter(d => ['queued', 'scheduled', 'paused'].includes(statusOf(d))).length
  };
  $$('[data-filter]').forEach(button => {
    const f = button.dataset.filter;
    if (counts[f] !== undefined) {
      let badge = $('.cat-badge', button);
      if (!badge) {
        badge = element('span', 'cat-badge');
        button.append(badge);
      }
      badge.textContent = String(counts[f]);
      badge.hidden = counts[f] === 0 && f !== 'all';
    }
  });
  $$('[data-category]').forEach(button => {
    const cat = button.dataset.category;
    const count = state.downloads.filter(d => categoryOf(d) === cat).length;
    let badge = $('.cat-badge', button);
    if (!badge) {
      badge = element('span', 'cat-badge');
      button.append(badge);
    }
    badge.textContent = String(count);
    badge.hidden = count === 0;
  });
}
function updateControls() { const d = selected(), hasSelected = Boolean(selectedIds.size || d), busy = Boolean((d && pending.has(d.id)) || [...selectedIds].some(id => pending.has(id))); $('#resume-selected').disabled = (!canResume(d) && !d?.needsReview) || busy; $('#stop-selected').disabled = !canPause(d) || busy; $('#remove-selected').disabled = !hasSelected || busy; $('#open-selected').disabled = !d || statusOf(d) !== 'completed'; $('#reveal-selected').disabled = !d; $('#details-selected').disabled = !d; $('#pause-all').disabled = !state.downloads.some(canPause); $('#stop-queue').disabled = $('#pause-all').disabled; $('#resume-all').disabled = !state.downloads.some(canResume); $('#remove-completed').disabled = !state.downloads.some(d => statusOf(d) === 'completed'); $('#scheduler-start').disabled = $('#resume-all').disabled; $('#scheduler-stop').disabled = $('#pause-all').disabled; }
function render() { visibleDownloads = state.downloads.filter(matches).sort((a, b) => { const result = sort === 'total' ? numeric(a.total) - numeric(b.total) : (sort === 'createdAt' || sort === 'lastTry') ? (new Date(a.lastTry || a.createdAt || 0) - new Date(b.lastTry || b.createdAt || 0)) : String(a[sort] || '').localeCompare(String(b[sort] || '')); return ascending ? result : -result; }); $('#download-list').replaceChildren(...visibleDownloads.map(rowFor)); $('#empty-state').hidden = visibleDownloads.length > 0; $('#empty-message').textContent = searchTerm ? 'No downloads match your search.' : 'No downloads to display.'; const complete = state.downloads.filter(d => statusOf(d) === 'completed').length; $('#list-count').textContent = `${visibleDownloads.length} ${visibleDownloads.length === 1 ? 'download' : 'downloads'}${state.downloads.length !== visibleDownloads.length ? ` of ${state.downloads.length}` : ''} (${complete} completed)`; const totalSpeed = state.downloads.reduce((sum, d) => sum + numeric(d.speed), 0); $('#status-summary').textContent = `${bytes(totalSpeed)}/sec`; const throughputChip = $('#status-summary')?.closest('.throughput-chip'); if (throughputChip) throughputChip.classList.toggle('is-active', totalSpeed > 0); updateCategoryBadges(); const integrationButton = $('#integration-button'), needsBrowser = Boolean(state.integration?.packaged) && !(state.integration?.connectedBrowsers?.length); integrationButton.classList.toggle('needs-attention', needsBrowser); integrationButton.title = needsBrowser ? 'No browser integration is connected. Click to set it up.' : 'Browser Integration'; integrationButton.setAttribute('aria-label', integrationButton.title); updateControls(); if ((progressMode || $('#details-dialog').open) && (detailId || progressMode)) renderDetails(); if ($('#scheduler-dialog').open) renderScheduler(); }
function selectAll() { if (!visibleDownloads.length) return; selectedIds.clear(); for (const d of visibleDownloads) selectedIds.add(d.id); selectedId = visibleDownloads[0]?.id || null; selectionAnchorId = selectedId; paintSelection(); }
async function removeSelected() {
  const ids = selectedIds.size ? [...selectedIds].filter(id => id && !pending.has(id)) : (selectedId && !pending.has(selectedId) ? [selectedId] : []);
  if (!ids.length) return;
  const targets = state.downloads.filter(d => ids.includes(d.id));
  if (!targets.length) return;
  const prompt = targets.length === 1
    ? `Delete “${targets[0].filename || 'this download'}” from the download list?\n\nThe downloaded file will remain on your PC.`
    : `Delete ${targets.length} selected downloads from the download list?\n\nThe downloaded files will remain on your PC.`;
  if (!window.confirm(prompt)) return;
  for (const id of ids) pending.add(id);
  updateControls();
  try {
    const results = await Promise.allSettled(ids.map(id => call('action', { id, action: 'remove' })));
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length) notify(messageOf(failures[0].reason), true);
    await refresh();
  } catch (error) { notify(messageOf(error), true); }
  finally {
    for (const id of ids) pending.delete(id);
    selectedIds.clear(); selectedId = null; selectionAnchorId = null;
    updateControls();
    if ($('#details-dialog').open) renderDetails();
  }
}
async function performAction(d, action) { if (!d || pending.has(d.id)) return; if (action === 'remove') return removeSelected(); pending.add(d.id); updateControls(); try { await call('action', { id: d.id, action }); await refresh(); } catch (error) { notify(messageOf(error), true); } finally { pending.delete(d.id); updateControls(); if ($('#details-dialog').open) renderDetails(); } }
async function bulkAction(action) { const downloads = state.downloads.filter(action === 'pause' ? canPause : canResume); const results = await Promise.allSettled(downloads.map(d => call('action', { id: d.id, action: action === 'resume' && ['failed', 'cancelled'].includes(statusOf(d)) ? 'retry' : action }))); const failures = results.filter(r => r.status === 'rejected'); if (failures.length) notify(`${failures.length} operation(s) failed: ${messageOf(failures[0].reason)}`, true); try { await refresh(); } catch (error) { notify(messageOf(error), true); } }
async function removeCompleted() { const downloads = state.downloads.filter(d => statusOf(d) === 'completed'); if (!downloads.length || !window.confirm(`Delete ${downloads.length} completed download(s) from the list?\n\nThe downloaded files will remain on your PC.`)) return; const results = await Promise.allSettled(downloads.map(d => call('action', { id: d.id, action: 'remove' }))); const failures = results.filter(r => r.status === 'rejected'); if (failures.length) notify(messageOf(failures[0].reason), true); try { await refresh(); } catch (error) { notify(messageOf(error), true); } }
function showDialog(id) { const dialog = $(id); if (!dialog.open) dialog.showModal(); }
function openAdd(text = '', scheduled = '') { if (!addMode && !progressMode) { call('openAdd', { scheduled }).catch(error => notify(messageOf(error), true)); return; } pendingReviewId = null; $('#add-error').hidden = true; $('#download-urls').value = text; $('#download-urls').readOnly = false; $('#download-filename').value = ''; $('#download-description').value = ''; $('#download-category').value = ''; if ($('#download-user')) $('#download-user').value = ''; if ($('#download-pass')) $('#download-pass').value = ''; rememberInput.checked = false; rememberInput.disabled = true; $('#download-schedule').value = scheduled; $('#add-directory').value = state.settings.defaultDirectory || ''; showDialog('#add-dialog'); $('#download-urls').focus(); }
async function openAddFromClipboard() { if (!addMode && !progressMode) { await call('openAdd', { paste: true }); return; } openAdd(await call('clipboard')); }
function openReview(id) { if (!progressMode) { call('openProgress', { id }).catch(e => notify(messageOf(e), true)); return; } document.body.classList.add('review-window'); document.title = 'Download File Info'; const d = state.downloads.find(item => item.id === id && item.needsReview); if (!d || dismissedReviews.has(id)) return; openAdd(d.url || ''); pendingReviewId = id; $('#download-urls').readOnly = true; $('#download-filename').value = d.filename || ''; $('#download-description').value = d.description || ''; $('#download-category').value = d.category || ''; rememberInput.disabled = !$('#download-category').value; $('#add-directory').value = d.directory || state.settings.defaultDirectory || ''; }
async function dismissReview() { if (!pendingReviewId) return; const id = pendingReviewId; dismissedReviews.add(id); pendingReviewId = null; try { await call('action', { id, action: 'remove' }); await refresh(); if (progressMode) await call('closeProgress'); } catch (error) { notify(messageOf(error), true); } }
function showDetails(id) { if (state.downloads.find(d => d.id === id)?.needsReview) { openReview(id); return; } if (!progressMode) { call('openProgress', { id }).catch(e => notify(messageOf(e), true)); return; } document.body.classList.remove('review-window'); detailId = id; $('#detail-speed-limit').value = state.settings.speedLimitKbps || 0; $('#notify-complete').checked = state.settings.notifyOnComplete !== false; $('#reveal-complete').checked = state.settings.revealOnComplete === true; if ($('#detail-post-action')) $('#detail-post-action').value = state.settings.postCompleteAction || 'none'; $('#completion-result').textContent = ''; setDetailTab('status'); showDialog('#details-dialog'); renderDetails(); }
function updateGithubProgress(d, percent, status) {
  const grid = $('#github-boxes-grid');
  if (!grid) return;
  if (grid.children.length !== 100) {
    grid.replaceChildren();
    for (let i = 0; i < 100; i++) {
      const box = element('span', 'gh-box level-0');
      box.dataset.index = String(i);
      grid.append(box);
    }
  }

  const percentEl = $('#github-progress-percent');
  const blocksEl = $('#github-progress-blocks');
  const bytesEl = $('#github-progress-bytes');
  const detailEl = $('#github-status-detail');

  const names = {
    completed: 'Complete',
    downloading: 'Receiving data…',
    connecting: 'Connecting to server…',
    paused: 'Stopped',
    queued: 'Queued',
    scheduled: 'Scheduled',
    failed: 'Error occurred',
    cancelled: 'Cancelled',
    assembling: 'Finalizing file…'
  };

  grid.classList.remove('is-streaming', 'is-paused', 'is-error', 'is-complete');
  const microBar = $('#github-micro-bar');

  if (status === 'completed' || (percent !== null && percent >= 100)) {
    grid.classList.add('is-complete');
    for (let i = 0; i < 100; i++) {
      const box = grid.children[i];
      box.className = 'gh-box level-4';
      box.style.removeProperty('--fill-pct');
      box.title = `Block ${i + 1} of 100 (100% Complete)`;
    }
    if (percentEl) percentEl.textContent = '100%';
    if (blocksEl) blocksEl.textContent = '100 / 100 blocks complete';
    if (bytesEl) bytesEl.textContent = bytes(d.total || d.downloaded);
    if (detailEl) detailEl.textContent = 'All 100 blocks verified and assembled';
    if (microBar) { microBar.style.width = '100%'; microBar.className = 'github-micro-bar is-complete'; }
    grid.setAttribute('aria-valuenow', '100');
    return;
  }

  if (status === 'paused' || status === 'cancelled') {
    grid.classList.add('is-paused');
  } else if (status === 'failed') {
    grid.classList.add('is-error');
  }

  if (bytesEl) bytesEl.textContent = `${bytes(d.downloaded)}${d.total ? ` / ${bytes(d.total)}` : ''}`;

  if (percent === null && ['downloading', 'connecting', 'assembling'].includes(status)) {
    grid.classList.add('is-streaming');
    if (percentEl) percentEl.textContent = 'Streaming…';
    if (blocksEl) blocksEl.textContent = d.streamProgress?.completed ? `${d.streamProgress.completed} segments` : 'Dynamic stream';
    if (detailEl) detailEl.textContent = status === 'assembling' ? 'Finalizing assembled stream…' : `Receiving data at ${bytes(d.speed)}/sec`;
    if (microBar) { microBar.style.width = '100%'; microBar.className = 'github-micro-bar is-streaming'; }
    for (let i = 0; i < 100; i++) {
      const box = grid.children[i];
      box.className = `gh-box level-${(i % 4) + 1}`;
      box.style.removeProperty('--fill-pct');
      box.style.animationDelay = `${(i % 25) * 0.05}s`;
      box.title = `Streaming transfer (${bytes(d.downloaded)} downloaded)`;
    }
    grid.removeAttribute('aria-valuenow');
    return;
  }

  const pct = Math.min(100, Math.max(0, percent || 0));
  grid.setAttribute('aria-valuenow', String(Math.floor(pct)));
  if (percentEl) percentEl.textContent = `${pct.toFixed(1)}%`;
  if (microBar) {
    microBar.style.width = `${pct}%`;
    microBar.className = `github-micro-bar${status === 'paused' ? ' is-paused' : status === 'failed' ? ' is-error' : ''}`;
  }

  const completedBlocks = Math.floor(pct);
  if (blocksEl) blocksEl.textContent = `${completedBlocks} / 100 blocks`;

  if (detailEl) {
    if (status === 'downloading') {
      const time = timeLeft(d);
      detailEl.textContent = `${bytes(d.speed)}/sec${time ? ` • ${time} left` : ''}`;
    } else {
      detailEl.textContent = d.error || names[status] || status;
    }
  }

  const segments = Array.isArray(d.connectionsProgress) ? d.connectionsProgress : [];
  const hasRangedSegments = segments.length > 1 && numeric(d.total) > 0;

  if (hasRangedSegments) {
    const totalBytes = numeric(d.total);
    for (let i = 0; i < 100; i++) {
      const box = grid.children[i];
      const blockStart = (i / 100) * totalBytes;
      const blockEnd = ((i + 1) / 100) * totalBytes;
      let matched = null, sIdx = -1;
      for (let s = 0; s < segments.length; s++) {
        const seg = segments[s];
        if (seg.start <= blockStart && (seg.end === null || seg.end >= blockStart)) {
          matched = seg; sIdx = s; break;
        }
      }
      if (matched) {
        const segDown = matched.start + numeric(matched.downloaded);
        if (segDown >= blockEnd) {
          box.className = 'gh-box level-4';
          box.style.removeProperty('--fill-pct');
          box.title = `Block ${i + 1}: Connection #${sIdx + 1} (Complete)`;
        } else if (segDown > blockStart) {
          const frac = Math.min(100, Math.max(6, Math.round(((segDown - blockStart) / (blockEnd - blockStart)) * 100)));
          box.className = 'gh-box level-0 is-active';
          box.style.setProperty('--fill-pct', `${frac}%`);
          box.title = `Block ${i + 1}: Connection #${sIdx + 1} (${frac}% filled, ${bytes(matched.downloaded)} / ${bytes(matched.total)})`;
        } else {
          box.className = 'gh-box level-0';
          box.style.removeProperty('--fill-pct');
          box.title = `Block ${i + 1}: Connection #${sIdx + 1} (Pending)`;
        }
      } else {
        if (i < completedBlocks) {
          box.className = 'gh-box level-4';
          box.style.removeProperty('--fill-pct');
          box.title = `Block ${i + 1}: Complete`;
        } else if (i === completedBlocks && status === 'downloading') {
          const frac = Math.min(100, Math.max(6, Math.round((pct - completedBlocks) * 100)));
          box.className = 'gh-box level-0 is-active';
          box.style.setProperty('--fill-pct', `${frac}%`);
          box.title = `Block ${i + 1}: Active transfer (${frac}% filled)`;
        } else {
          box.className = 'gh-box level-0';
          box.style.removeProperty('--fill-pct');
          box.title = `Block ${i + 1}: Pending`;
        }
      }
    }
  } else {
    for (let i = 0; i < 100; i++) {
      const box = grid.children[i];
      if (i < completedBlocks) {
        const level = i < 25 ? 'level-2' : i < 60 ? 'level-3' : 'level-4';
        box.className = `gh-box ${level}`;
        box.style.removeProperty('--fill-pct');
        box.title = `Block ${i + 1} of 100: ${i + 1}% Complete`;
      } else if (i === completedBlocks && status === 'downloading') {
        const frac = Math.min(100, Math.max(6, Math.round((pct - completedBlocks) * 100)));
        box.className = 'gh-box level-0 is-active';
        box.style.setProperty('--fill-pct', `${frac}%`);
        box.title = `Block ${i + 1}: Downloading… (${frac}% filled, ${bytes(d.downloaded)})`;
      } else {
        box.className = 'gh-box level-0';
        box.style.removeProperty('--fill-pct');
        box.title = `Block ${i + 1}: Pending`;
      }
    }
  }
}
function renderDetails() {
  const targetId = detailId || progressMode;
  const d = state.downloads.find(d => d.id === targetId);
  if (!d) {
    if (!progressMode) $('#details-dialog').close();
    return;
  }
  detailId = d.id;
  const status = statusOf(d), percent = percentage(d), content = $('#details-content');
  $('#details-title').textContent = `${percent !== null ? `${Math.floor(percent)}% ` : ''}${d.filename || 'Download status'}`;
  const heroFilename = $('#detail-hero-filename');
  if (heroFilename) {
    heroFilename.textContent = d.filename || 'Preparing file…';
    heroFilename.title = d.filename || '';
  }
  const heroStatus = $('#detail-hero-status');
  if (heroStatus) {
    heroStatus.className = `hero-status-pill row-status ${status}`;
    let statusText = statusNames[status] || status;
    if (status === 'downloading') {
      statusText = percent !== null ? `Downloading (${percent.toFixed(1)}%)` : 'Receiving data…';
    } else if (status === 'completed') {
      statusText = 'Complete';
    }
    heroStatus.textContent = statusText;
    heroStatus.title = d.error || statusText;
  }
  const heroRate = $('#detail-hero-rate');
  if (heroRate) {
    heroRate.textContent = status === 'downloading' ? `${bytes(d.speed)}/sec` : (statusNames[status] || status);
    heroRate.classList.toggle('is-active', status === 'downloading' && numeric(d.speed) > 0);
    heroRate.closest('.hero-telemetry')?.classList.toggle('is-transferring', status === 'downloading' && numeric(d.speed) > 0);
  }
  const heroEta = $('#detail-hero-eta');
  if (heroEta) {
    heroEta.textContent = status === 'downloading' ? (timeLeft(d) ? `${timeLeft(d)} left` : 'Estimating…') : (status === 'completed' ? 'Finished' : (statusNames[status] || '—'));
  }
  const extension = (String(d.filename || d.path || '').match(/\.[a-z0-9]{1,12}$/i)?.[0] || '').toLowerCase();
  const heroIcon = $('#detail-hero-icon');
  if (heroIcon) {
    const nativeIcon = state.fileIcons?.[extension];
    if (nativeIcon) {
      heroIcon.className = 'file-type-icon native-file-icon';
      heroIcon.innerHTML = `<img src="${nativeIcon}" alt="" style="width:100%;height:100%;object-fit:contain;">`;
    } else {
      heroIcon.className = 'file-type-icon file-type-fallback';
      heroIcon.textContent = extension ? extension.replace('.', '').slice(0, 4).toUpperCase() : '';
    }
  }
  const heroExt = $('#detail-hero-ext');
  if (heroExt) {
    const extName = extension ? extension.replace('.', '').toUpperCase() : 'FILE';
    heroExt.textContent = extName;
    heroExt.dataset.ext = extName;
  }
  $('#transfer-source').textContent = d.url || '';
  $('#transfer-source').title = d.url || '';
  const statusLabel = status === 'downloading' && percent !== null ? `Receiving data… (${percent.toFixed(2)}%)` : (statusNames[status] || status);
  const rows = [
    ['Status', statusLabel],
    ['File size', sizeLabel(d)],
    ['Downloaded', `${bytes(d.downloaded)}${percent !== null ? ` (${percent.toFixed(2)}%)` : ''}`],
    ['Transfer rate', status === 'downloading' ? `${bytes(d.speed)}/sec` : '0 B/sec'],
    ['Time left', status === 'downloading' ? (timeLeft(d) || 'Estimating…') : '—'],
    ['Resume capability', d.resumable === true ? 'Yes' : d.resumable === false ? 'No' : 'Checking…']
  ];
  if (numeric(d.duration)) rows.splice(1, 0, ['Video duration', `${Math.floor(d.duration / 60)} min ${Math.floor(d.duration % 60)} sec`]);
  if (d.streamProgress?.total && status !== 'completed') rows.push(['Segments', `${d.streamProgress.completed} / ${d.streamProgress.total}`]);
  if (d.scheduledAt && status === 'scheduled') rows.push(['Start at', date(d.scheduledAt)]);
  if (d.notice) rows.push(['Note', d.notice]);
  content.replaceChildren();
  for (const [label, value] of rows) content.append(element('dt', '', label), element('dd', '', value));
  const progress = $('#detail-progress');
  if (percent === null && ['downloading', 'connecting'].includes(status)) progress?.removeAttribute('value');
  else if (progress) progress.value = percent || 0;
  updateGithubProgress(d, percent, status);
  const segments = Array.isArray(d.connectionsProgress) ? d.connectionsProgress : [];
  const bars = $('#segment-bars'), map = $('#segment-map');
  bars.replaceChildren();
  map.replaceChildren();
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const row = element('tr');
    const segmentStatus = segment.status === 'complete' || segment.status === 'completed' ? 'Completed.' : segment.status || (status === 'downloading' ? 'Receiving data…' : statusNames[status] || status);
    row.append(element('td', '', String(index + 1)), element('td', '', bytes(segment.downloaded)), element('td', '', segmentStatus));
    bars.append(row);
    const bar = element('progress');
    bar.max = 100;
    const total = numeric(segment.total);
    bar.value = total ? Math.min(100, numeric(segment.downloaded) / total * 100) : 0;
    bar.setAttribute('aria-label', `Connection ${index + 1} progress`);
    if (!total && status === 'downloading') bar.removeAttribute('value');
    map.append(bar);
  }
  $('#segment-note').textContent = segments.length ? `${segments.length} connection(s)` : status === 'completed' ? 'Download completed.' : 'Connection progress appears when the transfer starts.';
  $('#detail-error').textContent = d.error || '';
  $('#detail-error').hidden = !d.error;
  $('#detail-open').disabled = status !== 'completed';
  $('#detail-resume').disabled = !canResume(d) || pending.has(d.id);
  $('#detail-stop').disabled = !canPause(d) || pending.has(d.id);
  $('#detail-cancel').disabled = ['completed', 'cancelled'].includes(status) || pending.has(d.id);
  const refreshBtn = $('#detail-refresh-url');
  if (refreshBtn) refreshBtn.disabled = ['completed'].includes(status) || pending.has(d.id);
  $('.transfer-buttons').hidden = status === 'completed';
  const completeActions = $('#download-complete-actions');
  if (completeActions) completeActions.hidden = status !== 'completed';
  $('#details-dialog').classList.toggle('is-complete', status === 'completed');
}
function setDetailTab(name) { for (const tab of ['status', 'speed', 'completion']) { const active = tab === name; $(`#tab-${tab}`).classList.toggle('active-tab', active); $(`#tab-${tab}`).setAttribute('aria-selected', String(active)); $(`#${tab}-panel`).hidden = !active; } }
function setView(nextFilter, nextCategory = '') { filter = nextFilter; category = nextCategory; $$('[data-filter],[data-category]').forEach(button => { const active = nextCategory ? button.dataset.category === nextCategory : button.dataset.filter === nextFilter; button.classList.toggle('selected', active); if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); }); render(); }
function openSettings() {
  if (!optionsMode) { call('openOptions').catch(error => notify(messageOf(error), true)); return; }
  const settings = state.settings;
  $('#start-with-windows').checked = settings.startWithWindows !== false;
  if ($('#theme-select')) $('#theme-select').value = settings.theme || 'light';
  $('#default-directory').value = settings.defaultDirectory || '';
  $('#max-concurrent').value = settings.maxConcurrent || 3;
  $('#connections').value = settings.connections || 8;
  $('#speed-limit').value = settings.speedLimitKbps || 0;
  if ($('#post-complete-action')) $('#post-complete-action').value = settings.postCompleteAction || 'none';
  $('#settings-error').hidden = true;
  showDialog('#settings-dialog');
}
function renderScheduler() { const downloads = state.downloads.filter(d => statusOf(d) === 'scheduled').sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)); const list = $('#scheduled-list'); list.replaceChildren(); if (!downloads.length) list.append(element('p', 'field-help', 'No scheduled downloads.')); for (const d of downloads) { const row = element('div', 'scheduled-item'); const name = element('span', '', d.filename); name.title = d.filename; row.append(name, element('time', '', date(d.scheduledAt))); list.append(row); } }
function openScheduler() { if (!schedulerMode) { call('openScheduler').catch(error => notify(messageOf(error), true)); return; } renderScheduler(); showDialog('#scheduler-dialog'); }
async function openIntegration() { try { await call('openIntegration'); } catch (error) { notify(messageOf(error), true); } }
const commands = { add: () => openAdd(), paste: async () => { try { await openAddFromClipboard(); } catch (error) { notify(messageOf(error), true); } }, find: () => $('#search').focus(), settings: openSettings, integration: openIntegration, scheduler: openScheduler, pauseAll: () => bulkAction('pause'), resumeAll: () => bulkAction('resume'), removeCompleted };
commands.find = () => { $('.list-search').classList.add('visible'); $('#search').focus(); };
commands.details = () => { if (selectedId) showDetails(selectedId); };
commands.remove = () => removeSelected();
commands.all = () => setView('all');
document.addEventListener('keydown', event => {
  if (event.ctrlKey && event.key.toLowerCase() === 'f') commands.find();
  if (event.key === 'Escape') $('.list-search').classList.remove('visible');
  if (event.altKey && event.key.toLowerCase() === 't') { event.preventDefault(); $('#theme-toggle')?.click(); }
});
$('#new-download').addEventListener('click', commands.add); $('#settings-button').addEventListener('click', openSettings); $('#integration-button').addEventListener('click', openIntegration); $('#scheduler-button').addEventListener('click', openScheduler); $('#pause-all').addEventListener('click', commands.pauseAll); $('#stop-queue').addEventListener('click', commands.pauseAll); $('#resume-all').addEventListener('click', commands.resumeAll); $('#remove-completed').addEventListener('click', removeCompleted);
$('#theme-toggle')?.addEventListener('click', async () => {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  try {
    await call('settings', { theme: next });
    await refresh();
  } catch (error) { notify(messageOf(error), true); }
});
$('#resume-selected').addEventListener('click', () => { const d = selected(); if (d?.needsReview) { openReview(d.id); return; } performAction(d, d && ['failed', 'cancelled'].includes(statusOf(d)) ? 'retry' : 'resume'); }); $('#stop-selected').addEventListener('click', () => performAction(selected(), 'pause')); $('#remove-selected').addEventListener('click', () => removeSelected()); $('#open-selected').addEventListener('click', () => performAction(selected(), 'open')); $('#reveal-selected').addEventListener('click', () => performAction(selected(), 'reveal')); $('#details-selected').addEventListener('click', () => { if (selectedId) showDetails(selectedId); });
const detailDownload = () => state.downloads.find(d => d.id === (detailId || progressMode));
$('#detail-open').addEventListener('click', () => performAction(detailDownload(), 'open')); $('#detail-folder').addEventListener('click', () => performAction(detailDownload(), 'reveal')); $('#detail-stop').addEventListener('click', () => performAction(detailDownload(), 'pause')); $('#detail-cancel').addEventListener('click', () => call('closeProgress').catch(error => notify(messageOf(error), true))); $('#detail-resume').addEventListener('click', () => { const d = detailDownload(); performAction(d, d && ['failed', 'cancelled'].includes(statusOf(d)) ? 'retry' : 'resume'); });
$('#detail-refresh-url')?.addEventListener('click', () => { const d = detailDownload(); if (!d) return; $('#refresh-error').hidden = true; $('#refresh-url-input').value = d.url || ''; showDialog('#refresh-dialog'); $('#refresh-url-input').focus(); });
$('#refresh-form')?.addEventListener('submit', async event => { event.preventDefault(); const d = detailDownload(); if (!d) return; const newUrl = $('#refresh-url-input').value.trim(); $('#refresh-error').hidden = true; const button = $('button[type=submit]', event.target); button.disabled = true; try { await call('refreshUrl', { id: d.id, url: newUrl }); $('#refresh-dialog').close(); await refresh(); renderDetails(); notify('Download address updated. Ready to resume.'); } catch (error) { $('#refresh-error').textContent = messageOf(error); $('#refresh-error').hidden = false; } finally { button.disabled = false; } });
$('#toggle-details').addEventListener('click', async () => { const details = $('#connection-details'); details.hidden = !details.hidden; document.body.classList.toggle('details-collapsed', details.hidden); $('#toggle-details').textContent = details.hidden ? '>> Show details' : '<< Hide details'; if (progressMode) try { await call('resizeProgress', { expanded: !details.hidden }); } catch (error) { notify(messageOf(error), true); } });
for (const tab of ['status', 'speed', 'completion']) $(`#tab-${tab}`).addEventListener('click', () => setDetailTab(tab));
$('#detail-speed-form').addEventListener('submit', async event => { event.preventDefault(); $('#detail-speed-error').hidden = true; try { await call('settings', { speedLimitKbps: Number($('#detail-speed-limit').value) }); await refresh(); notify('Global speed limit saved.'); } catch (error) { $('#detail-speed-error').textContent = messageOf(error); $('#detail-speed-error').hidden = false; } });
$('#completion-form').addEventListener('submit', async event => { event.preventDefault(); try { await call('settings', { notifyOnComplete: $('#notify-complete').checked, revealOnComplete: $('#reveal-complete').checked, postCompleteAction: $('#detail-post-action')?.value || 'none' }); await refresh(); $('#completion-result').textContent = ' Saved.'; } catch (error) { $('#completion-result').textContent = ` ${messageOf(error)}`; } });
$('#scheduler-start').addEventListener('click', commands.resumeAll); $('#scheduler-stop').addEventListener('click', commands.pauseAll); $('#schedule-new').addEventListener('click', () => { const future = new Date(Date.now() + 3600000), scheduled = new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString().slice(0, 16); if (schedulerMode) call('openAdd', { scheduled }).catch(error => notify(messageOf(error), true)); else { $('#scheduler-dialog').close(); openAdd('', scheduled); } });
$('#grabber-button').addEventListener('click', () => notify('Website grabber projects are not available in this build. Use Add URL to add direct download links.'));
$$('[data-filter]').forEach(button => button.addEventListener('click', () => setView(button.dataset.filter))); $$('[data-category]').forEach(button => button.addEventListener('click', () => setView('all', button.dataset.category))); $$('[data-sort]').forEach(button => button.addEventListener('click', () => { const next = button.dataset.sort; ascending = sort === next ? !ascending : true; sort = next; render(); })); $('#search').addEventListener('input', event => { searchTerm = event.target.value.trim().toLowerCase(); render(); });
const categoryExpander = $('.tree-expander[aria-controls]');
function setCategoryTreeExpanded(expanded) { const children = $(`#${categoryExpander.getAttribute('aria-controls')}`); children.hidden = !expanded; categoryExpander.textContent = expanded ? '⊟' : '⊞'; categoryExpander.setAttribute('aria-expanded', String(expanded)); categoryExpander.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} All Downloads categories`); }
categoryExpander.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); setCategoryTreeExpanded(categoryExpander.getAttribute('aria-expanded') !== 'true'); });
categoryExpander.addEventListener('keydown', event => { if (!['Enter', ' '].includes(event.key)) return; event.preventDefault(); event.stopPropagation(); setCategoryTreeExpanded(categoryExpander.getAttribute('aria-expanded') !== 'true'); });
function toggleSidebar(force) {
  const workArea = $('.work-area');
  if (!workArea) return;
  const isCollapsed = force !== undefined ? !force : workArea.classList.toggle('sidebar-collapsed');
  if (force !== undefined) workArea.classList.toggle('sidebar-collapsed', isCollapsed);
  try { localStorage.setItem('sidebar_collapsed', isCollapsed ? '1' : '0'); } catch { }
  const toggleBtn = $('#toggle-sidebar');
  if (toggleBtn) toggleBtn.title = isCollapsed ? 'Show Categories (Alt+B)' : 'Hide Categories (Alt+B)';
}
$('#sidebar-backdrop')?.addEventListener('click', () => toggleSidebar(false));
try { localStorage.removeItem('sidebar_collapsed'); $('.work-area')?.classList.remove('sidebar-collapsed'); } catch { }
const tableScroll = $('#table-scroll'), selectionRectangle = $('#selection-rectangle');
const tablePoint = event => { const bounds = tableScroll.getBoundingClientRect(); return { x: event.clientX - bounds.left + tableScroll.scrollLeft, y: event.clientY - bounds.top + tableScroll.scrollTop }; };
function initializeColumnResizing() {
  const table = $('.downloads-table'), columns = $$('.downloads-table col'), headers = $$('.downloads-table thead th');
  headers.forEach((header, index) => {
    const handle = element('span', 'column-resizer'); handle.setAttribute('aria-hidden', 'true'); header.append(handle);
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      const startX = event.clientX, startWidth = header.getBoundingClientRect().width, startTableWidth = table.getBoundingClientRect().width;
      handle.setPointerCapture(event.pointerId); document.body.classList.add('resizing-columns');
      const move = moveEvent => { const width = Math.max(index === 1 ? 20 : 45, startWidth + moveEvent.clientX - startX), delta = width - startWidth; columns[index].style.width = `${width}px`; table.style.width = `${Math.max(320, startTableWidth + delta)}px`; table.style.minWidth = table.style.width; };
      const finish = finishEvent => { try { handle.releasePointerCapture(finishEvent.pointerId); } catch { } handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', finish); handle.removeEventListener('pointercancel', finish); document.body.classList.remove('resizing-columns'); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', finish); handle.addEventListener('pointercancel', finish);
    });
  });
}
initializeColumnResizing();
tableScroll.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('thead') || event.target.closest('button')) return;
  // A click synthesized for the pointer-up that ended a marquee is ignored.
  // A later, new pointer-down must always restore ordinary single-click use.
  suppressRowClick = false;
  tableScroll.focus({ preventScroll: true });
  const point = tablePoint(event), row = event.target.closest('.download-row');
  const additive = event.ctrlKey || event.metaKey, range = event.shiftKey;
  selectionDrag = { pointerId: event.pointerId, startX: point.x, startY: point.y, row, additive, range, base: (additive || range) ? new Set(selectedIds) : new Set(), moved: false };
  tableScroll.setPointerCapture(event.pointerId);
});
tableScroll.addEventListener('pointermove', event => {
  if (!selectionDrag || selectionDrag.pointerId !== event.pointerId) return;
  const point = tablePoint(event), dx = point.x - selectionDrag.startX, dy = point.y - selectionDrag.startY;
  if (!selectionDrag.moved && Math.hypot(dx, dy) < 4) return;
  selectionDrag.moved = true;
  const left = Math.min(selectionDrag.startX, point.x), top = Math.min(selectionDrag.startY, point.y), right = Math.max(selectionDrag.startX, point.x), bottom = Math.max(selectionDrag.startY, point.y);
  Object.assign(selectionRectangle.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(1, right - left)}px`, height: `${Math.max(1, bottom - top)}px` }); selectionRectangle.hidden = false;
  selectedIds.clear(); for (const id of selectionDrag.base) selectedIds.add(id);
  const viewport = tableScroll.getBoundingClientRect();
  for (const row of $$('.download-row')) { const rect = row.getBoundingClientRect(), rowLeft = rect.left - viewport.left + tableScroll.scrollLeft, rowTop = rect.top - viewport.top + tableScroll.scrollTop; if (rowLeft < right && rowLeft + rect.width > left && rowTop < bottom && rowTop + rect.height > top) selectedIds.add(row.dataset.id); }
  selectedId = selectedIds.values().next().value || null; paintSelection(); event.preventDefault();
});
function finishMarquee(event) { if (!selectionDrag || selectionDrag.pointerId !== event.pointerId) return; const { moved, row, additive, range } = selectionDrag; try { tableScroll.releasePointerCapture(event.pointerId); } catch { } selectionDrag = null; selectionRectangle.hidden = true; if (moved) { if (row) selectionAnchorId = row.dataset.id; } else if (row) selectDownload(row.dataset.id, { additive, range, toggle: additive && !range }); else selectDownload(null); suppressRowClick = true; setTimeout(() => { suppressRowClick = false; }, 0); }
tableScroll.addEventListener('pointerup', finishMarquee); tableScroll.addEventListener('pointercancel', finishMarquee);
$('#table-scroll').addEventListener('keydown', event => { if (!visibleDownloads.length) return; const index = visibleDownloads.findIndex(d => d.id === selectedId); if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? visibleDownloads.length - 1 : Math.max(0, Math.min(visibleDownloads.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))); selectDownload(visibleDownloads[next].id, { range: event.shiftKey }); $$('.download-row').find(row => row.dataset.id === selectedId)?.scrollIntoView({ block: 'nearest' }); } if (event.key === 'Enter' && selectedId) showDetails(selectedId); if (event.key === 'Delete') removeSelected(); });
$('#dismiss-toast').addEventListener('click', () => { $('#toast').hidden = true; }); $$('[data-close]').forEach(button => button.addEventListener('click', () => { const dialog = button.closest('dialog'); if (progressMode && dialog.id === 'add-dialog' || addMode && dialog.id === 'add-dialog' || optionsMode && dialog.id === 'settings-dialog' || schedulerMode && dialog.id === 'scheduler-dialog') { call('closeProgress').catch(error => notify(messageOf(error), true)); return; } dialog.close(); if (dialog.id === 'add-dialog') dismissReview(); })); $('#add-dialog').addEventListener('cancel', event => { if (progressMode || addMode) { event.preventDefault(); call('closeProgress').catch(error => notify(messageOf(error), true)); } else dismissReview(); }); document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); if (!$$('dialog[open]').length) openAdd(); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && !$$('dialog[open]').length) { event.preventDefault(); $('#search').focus(); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && !['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase()) && !$$('dialog[open]').length) { event.preventDefault(); selectAll(); } if (((event.altKey || event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') && !['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase()) && !$$('dialog[open]').length) { event.preventDefault(); toggleSidebar(); } });
$('#paste-button').addEventListener('click', async () => { try { $('#download-urls').value = await call('clipboard'); $('#download-urls').focus(); } catch (error) { $('#add-error').textContent = messageOf(error); $('#add-error').hidden = false; } }); $('#add-browse').addEventListener('click', async () => { try { const path = await call('chooseDirectory'); if (typeof path === 'string' && path) $('#add-directory').value = path; } catch (error) { $('#add-error').textContent = messageOf(error); $('#add-error').hidden = false; } });
$('#download-category').addEventListener('change', event => { const folder = state.settings.categoryDirectories?.[event.target.value]; if (folder) $('#add-directory').value = folder; rememberInput.disabled = !event.target.value; if (rememberInput.disabled) rememberInput.checked = false; });
$('#add-form').addEventListener('submit', async event => {
  event.preventDefault();
  const errorElement = $('#add-error'); errorElement.hidden = true;
  const urls = $('#download-urls').value.split(/\r?\n/).map(url => url.trim()).filter(Boolean);
  const filename = $('#download-filename').value.trim(), scheduled = $('#download-schedule').value;
  try {
    if (!urls.length) throw new Error('Enter at least one download address.');
    for (const url of urls) { let parsed; try { parsed = new URL(url); } catch { throw new Error(`Invalid address: ${url}`); } if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Download addresses must begin with http:// or https://.'); }
    if (filename && urls.length !== 1) throw new Error('A custom file name can only be used for a single address.');
    const scheduledAt = scheduled ? new Date(scheduled).toISOString() : undefined;
    if (scheduledAt && new Date(scheduledAt).getTime() <= Date.now()) throw new Error('Choose a future start time or leave Start at empty.');
    $('#add-submit').disabled = true; $('#add-later').disabled = true;
    const directory = $('#add-directory').value, selectedCategory = $('#download-category').value, description = $('#download-description').value.trim();
    if (rememberInput.checked && selectedCategory && directory) await call('settings', { categoryDirectories: { ...state.settings.categoryDirectories, [selectedCategory]: directory } });
    const user = $('#download-user')?.value?.trim(), pass = $('#download-pass')?.value || '';
    const authHeaders = user ? { authorization: `Basic ${btoa(unescape(encodeURIComponent(`${user}:${pass}`)))}` } : undefined;
    const data = { ...(filename ? { filename } : {}), ...(scheduledAt ? { scheduledAt } : {}), ...(directory ? { directory } : {}), ...(selectedCategory ? { category: selectedCategory } : {}), ...(authHeaders ? { headers: authHeaders } : {}), description, queueOnly: event.submitter?.dataset.queueOnly === 'true' };
    const ids = pendingReviewId ? await call('review', { id: pendingReviewId, ...data }) : await call('add', { urls, ...data });
    pendingReviewId = null; if (!addMode) $('#add-dialog').close(); setView('all'); await refresh();
    if (!data.queueOnly && !scheduledAt && ids?.length === 1) { selectDownload(ids[0]); if (addMode) await call('openProgress', { id: ids[0] }); else { showDetails(ids[0]); if (progressMode) await call('openProgress', { id: ids[0] }); } } else if (progressMode) { await call('closeProgress'); }
    if (addMode) await call('closeProgress');
  } catch (error) { errorElement.textContent = messageOf(error); errorElement.hidden = false; }
  finally { $('#add-submit').disabled = false; $('#add-later').disabled = false; }
});
$('#choose-directory').addEventListener('click', async () => { try { const path = await call('chooseDirectory'); if (typeof path === 'string' && path) $('#default-directory').value = path; } catch (error) { $('#settings-error').textContent = messageOf(error); $('#settings-error').hidden = false; } }); $('#settings-form').addEventListener('submit', async event => { event.preventDefault(); const button = $('button[type=submit]', event.target); $('#settings-error').hidden = true; button.disabled = true; try { const chosenTheme = $('#theme-select')?.value || 'light'; await call('settings', { startWithWindows: $('#start-with-windows').checked, defaultDirectory: $('#default-directory').value.trim(), maxConcurrent: Number($('#max-concurrent').value), connections: Number($('#connections').value), speedLimitKbps: Number($('#speed-limit').value), postCompleteAction: $('#post-complete-action')?.value || 'none', theme: chosenTheme }); applyTheme(chosenTheme); await refresh(); if (optionsMode) await call('closeProgress'); else $('#settings-dialog').close(); } catch (error) { $('#settings-error').textContent = messageOf(error); $('#settings-error').hidden = false; } finally { button.disabled = false; } });
async function start() { try { await refresh(); if (typeof api.subscribe === 'function') unsubscribe = api.subscribe(snapshot => { if (snapshot?.downloads) acceptSnapshot(snapshot); else refresh().catch(error => notify(messageOf(error), true)); }); if (typeof api.onCommand === 'function') unsubscribeCommands = api.onCommand(async payload => { const command = typeof payload === 'string' ? payload : payload?.command; if (command === 'dismissBrowserIntegration') { if ($('#integration-dialog').open) $('#integration-dialog').close(); return; } if (command === 'reviewDownload') { try { await refresh(); if (!$$('dialog[open]').length) openReview(payload.id); } catch (error) { notify(messageOf(error), true); } return; } if (!$$('dialog[open]').length || ['pauseAll', 'resumeAll', 'removeCompleted'].includes(command)) commands[command]?.(); }); } catch (error) { $('#download-list').setAttribute('aria-busy', 'false'); $('#list-count').textContent = 'Download service unavailable'; $('#connection-label').textContent = 'Disconnected'; notify(messageOf(error), true); } }
window.addEventListener('beforeunload', () => { if (typeof unsubscribe === 'function') unsubscribe(); if (typeof unsubscribeCommands === 'function') unsubscribeCommands(); });
if (progressMode) {
  $('#details-dialog').addEventListener('close', () => call('closeProgress'));
  new MutationObserver(() => { document.title = $('#details-title').textContent; }).observe($('#details-title'), { childList: true, characterData: true, subtree: true });
  // The initial snapshot decides between confirmation and transfer progress.
}
if (integrationMode) $('#integration-dialog').addEventListener('close', () => call('closeProgress'));
if (optionsMode) $('#settings-dialog').addEventListener('close', () => call('closeProgress'));
if (schedulerMode) $('#scheduler-dialog').addEventListener('cancel', event => { event.preventDefault(); call('closeProgress').catch(error => notify(messageOf(error), true)); });
start().then(async () => {
  if (progressMode) { showDetails(progressMode); return; }
  if (optionsMode) { openSettings(); return; }
  if (addMode) { let text = ''; if (new URLSearchParams(location.search).get('paste') === '1') try { text = await call('clipboard'); } catch (error) { notify(messageOf(error), true); } openAdd(text, new URLSearchParams(location.search).get('scheduled') || ''); return; }
  if (schedulerMode) { openScheduler(); return; }
  if (integrationMode) {
    selectedBrowserName = null;
    $('#browser-detail').hidden = true;
    $('#browser-grid').hidden = false;
    $('#integration-dialog').show();
    await refreshIntegrationInfo(true);
    return;
  }
  if (state.integration.packaged && !state.integration.connectedBrowsers?.length && !localStorage.getItem('browser-setup-introduced') && !$$('dialog[open]').length) {
    await openIntegration();
    localStorage.setItem('browser-setup-introduced', '1');
  }
});
