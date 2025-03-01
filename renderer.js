document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Cargando index.html...');
    await cargarHistorial();
    await cargarTendencias();
    inicializarTema();
    const user = await window.electron.getCurrentUser();
    if (user) {
      document.getElementById('user-name').textContent = `${user.nombre} ${user.apellidoPaterno}`;
    } else {
      console.error('No se pudo obtener el usuario actual');
      showNotification('Error al cargar los datos del usuario. Por favor, inicia sesión nuevamente.');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 3000);
    }

    if (window.electron && window.electron.on) {
      window.electron.on('set-theme', (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
      });
      window.electron.on('pdf-notification', (message) => {
        showNotification(message);
      });
      window.electron.on('alert', (message) => {
        showNotification(message);
      });
      window.electron.on('notification', (message) => {
        showNotification(message);
      });
    } else {
      console.error('window.electron no está definido en renderer.js');
    }

    document.querySelectorAll('button[href], #profile-btn, #reminders-btn, #logout-btn').forEach(element => {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.add('fade-out');
        setTimeout(() => {
          if (element.id === 'logout-btn') {
            window.electron.logoutUser();
          } else {
            window.location.href = element.id === 'profile-btn' ? 'profile.html' : element.id === 'reminders-btn' ? 'reminders.html' : 'index.html';
          }
        }, 300);
      });
    });
  } catch (error) {
    console.error('Error al cargar index.html:', error.message || error);
    showNotification('Error al cargar la página. Redirigiendo al inicio de sesión...');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 3000);
  }
});

const form = document.getElementById('registro-form');
const themeSelect = document.getElementById('theme-select');
const profileBtn = document.getElementById('profile-btn');
const remindersBtn = document.getElementById('reminders-btn');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const fecha = document.getElementById('fecha').value;
  const hora = document.getElementById('hora').value;
  const sistolica = document.getElementById('sistolica').value;
  const diastolica = document.getElementById('diastolica').value;
  const pulso = document.getElementById('pulso').value;
  const comentario = document.getElementById('comentario').value;

  if (!fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
    showNotification('La fecha debe estar en formato YYYY-MM-DD.');
    return;
  }
  if (!hora.match(/^\d{2}:\d{2}$/)) {
    showNotification('La hora debe estar en formato HH:MM.');
    return;
  }
  if (!sistolica || isNaN(sistolica) || sistolica < 0) {
    showNotification('La presión sistólica debe ser un número positivo.');
    return;
  }
  if (!diastolica || isNaN(diastolica) || diastolica < 0) {
    showNotification('La presión diastólica debe ser un número positivo.');
    return;
  }
  if (!pulso || isNaN(pulso) || pulso < 0) {
    showNotification('El pulso debe ser un número positivo.');
    return;
  }
  if (comentario.length > 500) {
    showNotification('El comentario no puede exceder los 500 caracteres.');
    return;
  }

  try {
    await window.electron.guardarRegistro({ fecha, hora, sistolica, diastolica, pulso, comentario });
    form.reset();
    await cargarHistorial();
    await cargarTendencias();
    showNotification('Registro guardado correctamente');
  } catch (error) {
    console.error('Error al guardar registro:', error.message || error);
    showNotification(`Hubo un error al guardar el registro: ${error.message || error}`);
  }
});

profileBtn.addEventListener('click', () => {
  document.body.classList.add('fade-out');
  setTimeout(() => {
    window.location.href = 'profile.html';
  }, 300);
});

remindersBtn.addEventListener('click', () => {
  document.body.classList.add('fade-out');
  setTimeout(() => {
    window.location.href = 'reminders.html';
  }, 300);
});

document.getElementById('exportarPDF').addEventListener('click', async () => {
  try {
    const from = document.getElementById('date-from-pdf').value;
    const to = document.getElementById('date-to-pdf').value;
    const canvas = document.getElementById('graficaPresion');
    const imageData = await html2canvas(canvas).then(canvas => canvas.toDataURL('image/png'));
    const filePath = await window.electron.exportarPDF({ from, to, chartImage: imageData });
    showNotification(`PDF guardado en: ${filePath}`);
  } catch (error) {
    console.error('Error al exportar PDF:', error.message || error);
    showNotification(`Hubo un error al exportar el PDF: ${error.message || error}`);
  }
});

document.getElementById('exportarCSV').addEventListener('click', async () => {
  try {
    const from = document.getElementById('date-from-csv').value;
    const to = document.getElementById('date-to-csv').value;
    const filePath = await window.electron.exportarCSV({ from, to });
    showNotification(`CSV guardado en: ${filePath}`);
  } catch (error) {
    console.error('Error al exportar CSV:', error.message || error);
    showNotification(`Hubo un error al exportar el CSV: ${error.message || error}`);
  }
});

document.getElementById('importarDatos').addEventListener('click', async () => {
  try {
    const records = await window.electron.importCSV();
    if (records.length === 0) {
      showNotification('No se seleccionó ningún archivo.');
      return;
    }

    for (const record of records) {
      if (record.fecha && record.hora && record.sistolica && record.diastolica && record.pulso) {
        await window.electron.guardarRegistro(record);
      }
    }

    await cargarHistorial();
    await cargarTendencias();
    showNotification(`Se importaron ${records.length} registros.`);
  } catch (error) {
    console.error('Error al importar datos:', error.message || error);
    showNotification(`Hubo un error al importar los datos: ${error.message || error}`);
  }
});

document.getElementById('update-chart').addEventListener('click', () => {
  const from = document.getElementById('date-from').value;
  const to = document.getElementById('date-to').value;
  actualizarGraficaConRango(from, to);
});

document.getElementById('update-trends').addEventListener('click', () => {
  const from = document.getElementById('date-from-trends').value;
  const to = document.getElementById('date-to-trends').value;
  cargarTendencias(from, to);
});

async function cargarHistorial(from, to) {
  try {
    console.log('Cargando historial con rango:', from, to);
    const registros = await window.electron.obtenerRegistros({ from, to });
    console.log('Registros obtenidos:', registros);
    const historial = document.getElementById('historial');

    historial.innerHTML = registros.length
      ? registros.map(r => `
          <p data-id="${r.id}">${r.fecha} ${r.hora} - ${r.sistolica}/${r.diastolica} - Pulso: ${r.pulso}
          ${r.comentario ? `<br>Comentario: ${r.comentario}` : ''}
          <button class="delete-btn">Eliminar</button></p>
        `).join('')
      : '<p>No hay registros aún.</p>';

    const deleteButtons = historial.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const id = button.parentElement.getAttribute('data-id');
        await eliminarRegistro(id);
      });
    });

    historial.addEventListener('mouseenter', () => {
      historial.style.maxHeight = '300px';
    });
    historial.addEventListener('mouseleave', () => {
      historial.style.maxHeight = '150px';
    });

    actualizarGrafico(registros);
  } catch (error) {
    console.error('Error al cargar historial:', error.message);
    showNotification('Error al cargar el historial: ' + error.message);
  }
}

async function actualizarGraficaConRango(from, to) {
  try {
    console.log('Actualizando gráfica con rango:', from, to);
    if (!from || !to) {
      showNotification('Por favor, selecciona un rango de fechas válido para la gráfica.');
      return;
    }
    const registros = await window.electron.obtenerRegistros({ from, to });
    console.log('Registros obtenidos para gráfica:', registros);
    if (registros.length === 0) {
      console.log('No se encontraron registros en el rango de fechas:', from, 'a', to);
      showNotification('No se encontraron registros en el rango de fechas seleccionado.');
    }
    actualizarGrafico(registros);
  } catch (error) {
    console.error('Error al actualizar gráfica:', error.message);
    showNotification('Error al actualizar gráfica: ' + error.message);
  }
}

async function cargarTendencias(from, to) {
  try {
    console.log('Llamando a cargarTendencias con rango:', from, to);
    if (!from || !to) {
      console.log('Fechas no especificadas, usando rango por defecto');
      from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      to = new Date().toISOString().split('T')[0];
    }
    const trends = await window.electron.getTrends({ from, to });
    console.log('Tendencias recibidas:', trends);
    if (trends) {
      document.getElementById('avg-sistolica').textContent = trends.avgSistolica.toFixed(1);
      document.getElementById('avg-diastolica').textContent = trends.avgDiastolica.toFixed(1);
      document.getElementById('trends-period').textContent = `${trends.startDate} - ${trends.endDate}`;
    } else {
      console.error('No se recibieron datos de tendencias');
      showNotification('No se pudieron cargar las tendencias.');
    }
  } catch (error) {
    console.error('Error al cargar tendencias:', error.message);
    showNotification('Error al cargar las tendencias: ' + error.message);
  }
}

async function eliminarRegistro(id) {
  try {
    console.log('Eliminando registro con ID:', id);
    const result = await window.electron.eliminarRegistro(id);
    console.log('Resultado de eliminación:', result);
    await cargarHistorial();
    await cargarTendencias();
    showNotification('Registro eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar registro:', error.message || error);
    showNotification(`Hubo un error al eliminar el registro: ${error.message || error}`);
  }
}

let chart;

function actualizarGrafico(registros) {
  const ctx = document.getElementById('graficaPresion').getContext('2d');
  const labels = registros.map(r => `${r.fecha} ${r.hora}`);
  const sistolicaData = registros.map(r => r.sistolica);
  const diastolicaData = registros.map(r => r.diastolica);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Sistólica',
          data: sistolicaData,
          borderColor: '#e63946',
          backgroundColor: 'rgba(230, 57, 70, 0.2)',
          fill: false,
          tension: 0.3,
        },
        {
          label: 'Diastólica',
          data: diastolicaData,
          borderColor: '#457b9d',
          backgroundColor: 'rgba(69, 123, 157, 0.2)',
          fill: false,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: 'Presión (mmHg)' },
        },
        x: { title: { display: true, text: 'Fecha y Hora' } },
      },
    },
  });
}

function inicializarTema() {
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