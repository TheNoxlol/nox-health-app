document.addEventListener('DOMContentLoaded', async () => {
    const reminderForm = document.getElementById('reminder-form');
    const backBtn = document.getElementById('back-btn');
    const remindersList = document.getElementById('reminders-list');
  
    inicializarTema();
    await cargarRecordatorios();
  
    window.electron.on('set-theme', (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
    });
  
    reminderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = document.getElementById('reminder-type').value;
      const time = document.getElementById('reminder-time').value;
      try {
        await window.electron.setReminder({ type, time });
        showNotification('Recordatorio configurado correctamente');
        await cargarRecordatorios(); // Recargar la lista después de agregar un recordatorio
      } catch (error) {
        showNotification(`Error al configurar recordatorio: ${error.message}`);
      }
    });
  
    backBtn.addEventListener('click', () => {
      document.body.classList.add('fade-out');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 300);
    });
  });
  
  async function cargarRecordatorios() {
    try {
      const reminders = await window.electron.getReminders();
      const remindersList = document.getElementById('reminders-list');
      remindersList.innerHTML = reminders.length
        ? reminders.map(r => `
            <p data-id="${r.id}">
              ${r.type === 'measure-pressure' ? 'Medir Presión' : r.type === 'take-medication' ? 'Tomar Medicamento' : 'Otro'} - ${r.time}
              <button class="delete-reminder-btn">Eliminar</button>
            </p>
          `).join('')
        : '<p>No hay recordatorios activos.</p>';
  
      // Añadir eventos de clic a los botones de eliminación
      const deleteButtons = remindersList.querySelectorAll('.delete-reminder-btn');
      deleteButtons.forEach(button => {
        button.addEventListener('click', async () => {
          const id = button.parentElement.getAttribute('data-id');
          try {
            await window.electron.deleteReminder(id);
            showNotification('Recordatorio eliminado correctamente');
            await cargarRecordatorios(); // Recargar la lista después de eliminar
          } catch (error) {
            showNotification(`Error al eliminar recordatorio: ${error.message}`);
          }
        });
      });
    } catch (error) {
      console.error('Error al cargar recordatorios:', error.message);
      showNotification('Error al cargar recordatorios: ' + error.message);
    }
  }
  
  function inicializarTema() {
    const themeSelect = document.getElementById('theme-select');
    const savedTheme = localStorage.getItem('theme') || 'system';
    themeSelect.value = savedTheme;
    aplicarTema(savedTheme);
  
    themeSelect.addEventListener('change', (e) => {
      const nuevoTema = e.target.value;
      localStorage.setItem('theme', nuevoTema);
      aplicarTema(nuevoTema);
    });
  }
  
  async function aplicarTema(tema) {
    if (tema === 'system') {
      const systemTheme = await window.electron.getSystemTheme();
      document.documentElement.setAttribute('data-theme', systemTheme);
    } else {
      document.documentElement.setAttribute('data-theme', tema);
    }
  }
  
  function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden');
    notification.classList.add('visible');
    setTimeout(() => {
      notification.classList.remove('visible');
      notification.classList.add('hidden');
    }, 3000);
  }