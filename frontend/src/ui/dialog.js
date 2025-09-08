// Custom confirmation dialog utility
export function showConfirmDialog(title, message, confirmText, cancelText) {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';

    // Create dialog box
    const dialog = document.createElement('div');
    dialog.className = 'dialog-box';

    dialog.innerHTML = `
      <h3 class="dialog-title">${title}</h3>
      <p class="dialog-message">${message}</p>
      <div class="dialog-buttons">
        <button id="confirmBtn" class="dialog-btn dialog-btn-confirm">${confirmText}</button>
        <button id="cancelBtn" class="dialog-btn dialog-btn-cancel">${cancelText}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Add event listeners
    document.getElementById('confirmBtn').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(true);
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(false);
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(false);
      }
    });
  });
}
