window.fleetStore = {
  read(key) { return localStorage.getItem(key); },
  write(key, value) { localStorage.setItem(key, value); },
  download(name, contents) {
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};
