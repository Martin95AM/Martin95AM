export default class SaveManager {
  static key = 'martinquest-save-v1';
  static save(state) {
    try { localStorage.setItem(this.key, JSON.stringify({ ...state, savedAt: Date.now() })); return true; }
    catch { return false; }
  }
  static load() {
    try { const value = JSON.parse(localStorage.getItem(this.key)); return value?.scene ? value : null; }
    catch { return null; }
  }
  static clear() { localStorage.removeItem(this.key); }
}
