document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const introOverlay = document.getElementById('intro-overlay');
  const loginContent = document.getElementById('login-content');

  // Mostrar el contenido principal después de la animación de la intro
  setTimeout(() => {
    introOverlay.style.display = 'none';
    loginContent.style.display = 'block';
  }, 4000);

  inicializarTema();

  window.electron.on('set-theme', (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      await window.electron.loginUser({ email, password });
    } catch (error) {
      showNotification(`Error al iniciar sesión: ${error.message}`);
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userData = {
      nombre: document.getElementById('nombre').value,
      apellidoPaterno: document.getElementById('apellidoPaterno').value,
      apellidoMaterno: document.getElementById('apellidoMaterno').value,
      fechaNacimiento: document.getElementById('fechaNacimiento').value,
      sexo: document.getElementById('sexo').value,
      peso: parseFloat(document.getElementById('peso').value),
      estatura: parseInt(document.getElementById('estatura').value),
      email: document.getElementById('email').value,
      telefono: document.getElementById('telefono').value,
      password: document.getElementById('password').value
    };

    try {
      await window.electron.registerUser(userData);
    } catch (error) {
      showNotification(`Error al registrar usuario: ${error.message}`);
    }
  });
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