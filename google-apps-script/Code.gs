/* Deploy as a Google Apps Script Web App. Store DRIVE_SYNC_TOKEN in Script Properties.
 * Staged files are protected by Drive's encryption at rest; only the sync action can read them.
 */
const FOLDER_NAME = 'MartinQuest - registros pendientes';

function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}');
  if (body.action === 'stage') return stage_(body);
  if (!authorized_(body.token)) return json_({ error: 'No autorizado' });
  if (body.action === 'ack') return acknowledge_(body.ids || []);
  return json_({ error: 'Acción inválida' });
}

function doGet(e) {
  if (!authorized_(e.parameter.token)) return json_({ error: 'No autorizado' });
  const records = folder_().getFiles(); const pending = [];
  while (records.hasNext() && pending.length < 25) {
    const file = records.next();
    try { pending.push({ id: file.getId(), record: JSON.parse(file.getBlob().getDataAsString()) }); }
    catch (_) { /* Skip malformed records without deleting them. */ }
  }
  return json_({ records: pending });
}

function stage_(body) {
  if (!body.email || !body.filename || !body.data || String(body.data).length > 4000000) return json_({ error: 'Datos inválidos' });
  const record = { email: String(body.email), filename: String(body.filename), data: String(body.data), createdAt: new Date().toISOString() };
  folder_().createFile(Utilities.newBlob(JSON.stringify(record), 'application/json', 'pending-' + Date.now() + '.json'));
  return json_({ ok: true });
}

function acknowledge_(ids) {
  ids.forEach(id => { try { DriveApp.getFileById(id).setTrashed(true); } catch (_) {} });
  return json_({ ok: true });
}

function folder_() {
  const properties = PropertiesService.getScriptProperties(); const savedId = properties.getProperty('PENDING_FOLDER_ID');
  if (savedId) return DriveApp.getFolderById(savedId);
  const folder = DriveApp.createFolder(FOLDER_NAME); properties.setProperty('PENDING_FOLDER_ID', folder.getId()); return folder;
}
function authorized_(token) { return token && token === PropertiesService.getScriptProperties().getProperty('DRIVE_SYNC_TOKEN'); }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
