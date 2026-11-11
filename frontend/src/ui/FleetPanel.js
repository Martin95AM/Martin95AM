import './fleet.css';

export default class FleetPanel {
  constructor() {
    this.trigger = document.createElement('button');
    this.trigger.className = 'fleet-trigger';
    this.trigger.type = 'button';
    this.trigger.textContent = '🚚 Flota internacional';
    this.trigger.setAttribute('aria-haspopup', 'dialog');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.addEventListener('click', () => this.open());
    document.body.append(this.trigger);

    this.root = document.createElement('div');
    this.root.className = 'fleet-overlay';
    this.root.hidden = true;
    this.root.innerHTML = `<section class="fleet-shell" role="dialog" aria-modal="true" aria-label="Gestión de flota">
      <header><span>Gestión de flota · .NET</span><button type="button" aria-label="Cerrar gestión de flota">×</button></header>
      <iframe title="ABM de autos, embarcaciones y aviones" loading="lazy"></iframe>
    </section>`;
    document.body.append(this.root);
    this.frame = this.root.querySelector('iframe');
    this.closeButton = this.root.querySelector('button');
    this.closeButton.addEventListener('click', () => this.close());
    this.root.addEventListener('click', event => { if (event.target === this.root) this.close(); });
    this.root.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') this.close();
    }, true);
    this.frame.addEventListener('load', () => {
      try {
        this.frame.contentWindow.addEventListener('keydown', event => {
          if (event.key === 'Escape') this.close();
        });
      } catch { /* El botón Cerrar sigue disponible si el contenido no comparte origen. */ }
    });
  }

  open() {
    if (!this.frame.hasAttribute('src')) this.frame.src = `${import.meta.env.BASE_URL}fleet/index.html`;
    this.root.hidden = false;
    this.trigger.setAttribute('aria-expanded', 'true');
    this.closeButton.focus();
  }

  close() {
    this.root.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.focus();
  }
}
