document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.electron.getCurrentUser();
  if (!user) {
    showNotification('Error al cargar los datos del usuario. Redirigiendo al inicio de sesión...');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 3000);
    return;
  }

  const nombreSpan = document.getElementById('nombre');
  const apellidoPaternoSpan = document.getElementById('apellidoPaterno');
  const apellidoMaternoSpan = document.getElementById('apellidoMaterno');
  const edadSpan = document.getElementById('edad');
  const sexoSpan = document.getElementById('sexo');
  const pesoSpan = document.getElementById('peso');
  const estaturaSpan = document.getElementById('estatura');
  const emailSpan = document.getElementById('email');
  const telefonoSpan = document.getElementById('telefono');
  const editNombre = document.getElementById('edit-nombre');
  const editApellidoPaterno = document.getElementById('edit-apellidoPaterno');
  const editApellidoMaterno = document.getElementById('edit-apellidoMaterno');
  const editFechaNacimiento = document.getElementById('edit-fechaNacimiento');
  const editSexo = document.getElementById('edit-sexo');
  const editPeso = document.getElementById('edit-peso');
  const editEstatura = document.getElementById('edit-estatura');
  const editTelefono = document.getElementById('edit-telefono');
  const editPassword = document.getElementById('edit-password');
  const alertsEnabledCheckbox = document.getElementById('alerts-enabled');
  const editForm = document.getElementById('edit-form');
  const backBtn = document.getElementById('back-btn');

  nombreSpan.textContent = user.nombre;
  apellidoPaternoSpan.textContent = user.apellidoPaterno;
  apellidoMaternoSpan.textContent = user.apellidoMaterno;
  const age = Math.floor((new Date() - new Date(user.fechaNacimiento)) / (1000 * 60 * 60 * 24 * 365.25));
  edadSpan.textContent = `${age} años`;
  sexoSpan.textContent = user.sexo === 'M' ? 'Masculino' : 'Femenino';
  pesoSpan.textContent = user.peso;
  estaturaSpan.textContent = user.estatura;
  emailSpan.textContent = user.email;
  telefonoSpan.textContent = user.telefono;

  editNombre.value = user.nombre;
  editApellidoPaterno.value = user.apellidoPaterno;
  editApellidoMaterno.value = user.apellidoMaterno;
  editFechaNacimiento.value = user.fechaNacimiento;
  editSexo.value = user.sexo;
  editPeso.value = user.peso;
  editEstatura.value = user.estatura;
  editTelefono.value = user.telefono;
  alertsEnabledCheckbox.checked = user.alertsEnabled;

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = editNombre.value;
    const apellidoPaterno = editApellidoPaterno.value;
    const apellidoMaterno = editApellidoMaterno.value;
    const fechaNacimiento = editFechaNacimiento.value;
    const sexo = editSexo.value;
    const peso = editPeso.value;
    const estatura = editEstatura.value;
    const telefono = editTelefono.value;
    const password = editPassword.value;
    const alertsEnabled = alertsEnabledCheckbox.checked;

    // Validaciones
    if (!nombre || nombre.length > 50) {
      showNotification('El nombre debe tener entre 1 y 50 caracteres.');
      return;
    }
    if (!apellidoPaterno || apellidoPaterno.length > 50) {
      showNotification('El apellido paterno debe tener entre 1 y 50 caracteres.');
      return;
    }
    if (!apellidoMaterno || apellidoMaterno.length > 50) {
      showNotification('El apellido materno debe tener entre 1 y 50 caracteres.');
      return;
    }
    if (!fechaNacimiento.match(/^\d{4}-\d{2}-\d{2}$/)) {
      showNotification('La fecha de nacimiento debe estar en formato YYYY-MM-DD.');
      return;
    }
    if (!['M', 'F'].includes(sexo)) {
      showNotification('El sexo debe ser "M" o "F".');
      return;
    }
    if (!peso || isNaN(peso) || peso <= 0 || peso > 500) {
      showNotification('El peso debe ser un número entre 1 y 500 kg.');
      return;
    }
    if (!estatura || isNaN(estatura) || estatura <= 0 || estatura > 300) {
      showNotification('La estatura debe ser un número entre 1 y 300 cm.');
      return;
    }
    if (!telefono.match(/^\d{10}$/)) {
      showNotification('El teléfono debe tener exactamente 10 dígitos.');
      return;
    }
    if (password && !password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/)) {
      showNotification('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial (!@#$%^&*).');
      return;
    }

    try {
      await window.electron.updateUser({
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        fechaNacimiento,
        sexo,
        peso,
        estatura,
        telefono,
        password,
        alertsEnabled
      });
      showNotification('Datos actualizados correctamente');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } catch (error) {
      console.error('Error al actualizar:', error.message);
      showNotification(`Error al actualizar: ${error.message}`);
    }
  });

  backBtn.addEventListener('click', () => {
    document.body.classList.add('fade-out');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 300);
  });

  inicializarTema();
});

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