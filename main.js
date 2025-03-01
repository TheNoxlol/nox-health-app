require('dotenv').config();
const { app, BrowserWindow, ipcMain, nativeTheme, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const pdfkit = require('pdfkit');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
const { parse } = require('csv-parse');
const { db, auth } = require('./firebase');
const { collection, addDoc, getDocs, doc, deleteDoc, query, where, orderBy, getDoc, updateDoc, setDoc, limit } = require('firebase/firestore');
const { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword } = require('firebase/auth');

let mainWindow;
let profileWindow;
let remindersWindow;
let userEmail;
let currentUser;
let reminders = {};
let alertsEnabled = false;
let lastAlertSent = null;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    title: 'NOX Health',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'icon.ico'),
    menuBarVisible: false,
    show: false,
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.setTitle('NOX Health');
    mainWindow.show();
  });

  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow.setTitle('NOX Health');
  });

  mainWindow.loadFile('login.html').catch(err => {
    console.error('Error al cargar login.html:', err);
  });
}

app.whenReady().then(() => {
  createMainWindow();
  Menu.setApplicationMenu(null);

  // Configurar autoUpdater para buscar actualizaciones
  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}).catch(err => {
  console.error('Error al iniciar la aplicación:', err);
});

// Configuración de eventos para autoUpdater
autoUpdater.on('checking-for-update', () => {
  console.log('Buscando actualizaciones...');
});

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('notification', `Una nueva actualización (versión ${info.version}) está disponible. Descargando...`);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('No hay actualizaciones disponibles.');
});

autoUpdater.on('error', (err) => {
  console.error('Error en la actualización:', err);
  mainWindow.webContents.send('notification', `Error en la actualización: ${err.message}`);
});

autoUpdater.on('download-progress', (progressObj) => {
  let percent = progressObj.percent.toFixed(1);
  mainWindow.webContents.send('notification', `Descargando actualización: ${percent}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow.webContents.send('notification', `Actualización (versión ${info.version}) descargada. La aplicación se reiniciará para instalarla.`);
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('register-user', async (event, data) => {
  try {
    const { nombre, apellidoPaterno, apellidoMaterno, fechaNacimiento, sexo, peso, estatura, email, telefono, password } = data;

    if (!auth) {
      throw new Error('El objeto auth no está inicializado');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      fechaNacimiento,
      sexo,
      peso,
      estatura,
      email,
      telefono,
      alertsEnabled: true
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Bienvenido a Registro de Presión Arterial',
      text: `Hola ${nombre} ${apellidoPaterno},\n\nGracias por registrarte en nuestra aplicación. Ahora puedes empezar a registrar tu presión arterial.\n\nSaludos,\nAtentamente,\nEl equipo de NoxHealth`,
    };

    await transporter.sendMail(mailOptions);
    console.log('Correo de bienvenida enviado a:', email);

    userEmail = email;
    currentUser = { nombre, apellidoPaterno, apellidoMaterno, fechaNacimiento, sexo, peso, estatura, email, telefono, alertsEnabled: true };
    mainWindow.loadFile('index.html').then(() => {
      mainWindow.setTitle('NOX Health');
      mainWindow.show();
    }).catch(err => {
      console.error('Error al cargar index.html:', err);
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error.message);
    throw error;
  }
});

ipcMain.handle('login-user', async (event, { email, password }) => {
  try {
    console.log('Buscando usuario con email:', email);
    if (!auth) {
      throw new Error('El objeto auth no está inicializado');
    }
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      throw new Error('Usuario no encontrado en Firestore');
    }

    const userDoc = userDocSnap.data();
    userEmail = email;
    alertsEnabled = userDoc.alertsEnabled;
    currentUser = {
      nombre: userDoc.nombre,
      apellidoPaterno: userDoc.apellidoPaterno,
      apellidoMaterno: userDoc.apellidoMaterno,
      fechaNacimiento: userDoc.fechaNacimiento,
      sexo: userDoc.sexo,
      peso: userDoc.peso,
      estatura: userDoc.estatura,
      email: userDoc.email,
      telefono: userDoc.telefono,
      alertsEnabled: userDoc.alertsEnabled
    };

    mainWindow.loadFile('index.html').then(() => {
      mainWindow.setTitle('NOX Health');
      mainWindow.show();
    }).catch(err => {
      console.error('Error al cargar index.html:', err);
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    throw error;
  }
});

ipcMain.handle('logout-user', async () => {
  try {
    await signOut(auth);
    userEmail = null;
    currentUser = null;
    alertsEnabled = false;
    mainWindow.loadFile('login.html').then(() => {
      mainWindow.setTitle('NOX Health');
      mainWindow.show();
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error.message);
    throw error;
  }
});

ipcMain.handle('get-current-user', () => {
  return currentUser;
});

ipcMain.handle('update-user', async (event, data) => {
  try {
    const { nombre, apellidoPaterno, apellidoMaterno, fechaNacimiento, sexo, peso, estatura, telefono, password, alertsEnabled: newAlertsEnabled } = data;

    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      fechaNacimiento,
      sexo,
      peso,
      estatura,
      telefono,
      alertsEnabled: newAlertsEnabled
    });

    if (password) {
      await updatePassword(user, password);
    }

    currentUser = { ...currentUser, nombre, apellidoPaterno, apellidoMaterno, fechaNacimiento, sexo, peso, estatura, telefono, alertsEnabled: newAlertsEnabled };
    alertsEnabled = newAlertsEnabled;
  } catch (error) {
    console.error('Error al actualizar usuario:', error.message);
    throw error;
  }
});

async function sendAlertEmail(message) {
  const now = Date.now();
  if (lastAlertSent && (now - lastAlertSent) < 24 * 60 * 60 * 1000) {
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'Alerta de NOX Health',
    text: `${message}\n\nAtentamente,\nEl equipo de NoxHealth`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Alerta enviada por correo a:', userEmail);
    lastAlertSent = now;
  } catch (error) {
    console.error('Error al enviar alerta por correo:', error);
  }
}

async function checkPressurePatterns() {
  if (!alertsEnabled) return;

  const user = auth.currentUser;
  if (!user) return;

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const fromTimestamp = threeDaysAgo.getTime();

  const q = query(
    collection(db, 'registros'),
    where('userId', '==', user.uid),
    where('timestamp', '>=', fromTimestamp),
    orderBy('timestamp', 'desc'),
    limit(3)
  );

  const querySnapshot = await getDocs(q);
  const rows = querySnapshot.docs.map(doc => doc.data());

  if (rows.length >= 3) {
    const highPressureDays = rows.filter(row => row.sistolica > 140 || row.diastolica > 90).length;
    if (highPressureDays === 3) {
      const message = 'Alerta: Se ha detectado presión alta durante 3 días consecutivos. Por favor, considera consultar a un médico.';
      mainWindow.webContents.send('alert', message);
      await sendAlertEmail(message);
    }
  }
}

ipcMain.handle('guardar-registro', async (event, data) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const { fecha, hora, sistolica, diastolica, pulso, comentario } = data;
    const dateTime = new Date(`${fecha}T${hora}:00`);
    const timestamp = dateTime.getTime();

    const docRef = await addDoc(collection(db, 'registros'), {
      fecha,
      timestamp,
      hora,
      sistolica: parseInt(sistolica),
      diastolica: parseInt(diastolica),
      pulso: parseInt(pulso),
      comentario: comentario || '',
      userId: user.uid
    });

    if (alertsEnabled) {
      let message = null;
      if (sistolica > 180 || diastolica > 120) {
        message = '¡Crisis hipertensiva detectada! Busca atención médica inmediata.';
        mainWindow.webContents.send('alert', message);
        await sendAlertEmail(message);
      } else if (sistolica > 140 || diastolica > 90) {
        message = 'Presión arterial alta detectada. Considera consultar a un médico.';
        mainWindow.webContents.send('alert', message);
        await sendAlertEmail(message);
      }
      await checkPressurePatterns();
    }
    return docRef.id;
  } catch (error) {
    console.error('Error al guardar registro:', error.message);
    throw error;
  }
});

ipcMain.handle('get-registros', async (event, { from, to } = {}) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    let q;
    if (from && to) {
      const fromDate = new Date(`${from}T00:00:00`);
      const toDate = new Date(`${to}T23:59:59`);
      const fromTimestamp = fromDate.getTime();
      const toTimestamp = toDate.getTime();

      q = query(
        collection(db, 'registros'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', fromTimestamp),
        where('timestamp', '<=', toTimestamp),
        orderBy('timestamp', 'asc')
      );
    } else {
      q = query(
        collection(db, 'registros'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'asc')
      );
    }

    const querySnapshot = await getDocs(q);
    const registros = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return registros;
  } catch (error) {
    console.error('Error al obtener registros:', error.message);
    throw error;
  }
});

ipcMain.handle('get-trends', async (event, { from, to }) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    let startTimestamp, endTimestamp;
    if (from && to) {
      const startDate = new Date(`${from}T00:00:00`);
      const endDate = new Date(`${to}T23:59:59`);
      startTimestamp = startDate.getTime();
      endTimestamp = endDate.getTime();
    } else {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date(defaultEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      startTimestamp = defaultStartDate.getTime();
      endTimestamp = defaultEndDate.getTime();
      from = defaultStartDate.toISOString().split('T')[0];
      to = defaultEndDate.toISOString().split('T')[0];
    }

    const q = query(
      collection(db, 'registros'),
      where('userId', '==', user.uid),
      where('timestamp', '>=', startTimestamp),
      where('timestamp', '<=', endTimestamp)
    );

    const querySnapshot = await getDocs(q);
    let registros = querySnapshot.docs.map(doc => doc.data());

    registros.sort((a, b) => a.timestamp - b.timestamp);

    const avgSistolica = registros.length ? registros.reduce((sum, reg) => sum + reg.sistolica, 0) / registros.length : 0;
    const avgDiastolica = registros.length ? registros.reduce((sum, reg) => sum + reg.diastolica, 0) / registros.length : 0;

    return {
      avgSistolica,
      avgDiastolica,
      startDate: from,
      endDate: to
    };
  } catch (error) {
    console.error('Error al obtener tendencias:', error.message);
    throw error;
  }
});

ipcMain.handle('eliminar-registro', async (event, id) => {
  try {
    console.log('Intentando eliminar registro con ID:', id);
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const docRef = doc(db, 'registros', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists() || docSnap.data().userId !== user.uid) {
      console.warn('No se encontró un registro con ID:', id, 'o no pertenece al usuario');
      return;
    }

    await deleteDoc(docRef);
    console.log('Registro eliminado con ID:', id);
  } catch (error) {
    console.error('Error al eliminar registro:', error.message);
    throw error;
  }
});

ipcMain.handle('exportar-pdf', async (event, { from, to, chartImage }) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T23:59:59`);
    const fromTimestamp = fromDate.getTime();
    const toTimestamp = toDate.getTime();

    const q = query(
      collection(db, 'registros'),
      where('userId', '==', user.uid),
      where('timestamp', '>=', fromTimestamp),
      where('timestamp', '<=', toTimestamp),
      orderBy('timestamp', 'asc')
    );

    const querySnapshot = await getDocs(q);
    let rows = querySnapshot.docs.map(doc => doc.data());

    rows.sort((a, b) => a.timestamp - b.timestamp);

    const doc = new pdfkit({ size: 'A4', margin: 50 });
    const filePath = path.join(app.getPath('desktop'), 'Historial_Presion_Arterial.pdf');
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fillColor('black').fontSize(18).text('Historial de Presión Arterial', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('gray').fontSize(12).text(`Período: ${from} - ${to}`, { align: 'center' });
    doc.moveDown(1);

    doc.strokeColor('gray').lineWidth(1).moveTo(50, 100).lineTo(550, 100).stroke();

    const age = Math.floor((new Date() - new Date(currentUser.fechaNacimiento)) / (1000 * 60 * 60 * 24 * 365.25));
    doc.fillColor('black').fontSize(12).text(`Nombre: ${currentUser.nombre} ${currentUser.apellidoPaterno} ${currentUser.apellidoMaterno}`);
    doc.text(`Edad: ${age} años`);
    doc.text(`Sexo: ${currentUser.sexo === 'M' ? 'Masculino' : 'Femenino'}`);
    doc.text(`Peso: ${currentUser.peso} kg`);
    doc.text(`Estatura: ${currentUser.estatura} cm`);
    doc.moveDown(1);

    const tableTop = doc.y;
    const rowHeight = 20;
    doc.fillColor('black').fontSize(10).text('Fecha', 50, tableTop).text('Hora', 150, tableTop).text('Sistólica', 220, tableTop).text('Diastólica', 290, tableTop).text('Pulso', 360, tableTop).text('Comentario', 420, tableTop);
    doc.strokeColor('gray').lineWidth(1).moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    rows.forEach((registro, index) => {
      const y = tableTop + (index + 1) * rowHeight;
      doc.text(registro.fecha, 50, y).text(registro.hora, 150, y).text(`${registro.sistolica} mmHg`, 220, y).text(`${registro.diastolica} mmHg`, 290, y).text(`${registro.pulso} bpm`, 360, y).text(registro.comentario || '', 420, y);
      doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    });

    doc.addPage();
    doc.fillColor('black').fontSize(14).text('Gráfica de Presión Arterial', { align: 'center' });
    doc.moveDown(0.5);
    if (chartImage) {
      doc.image(chartImage, 50, 150, { width: 500 });
    } else {
      doc.fillColor('gray').fontSize(10).text('No se pudo incluir la gráfica.', { align: 'center' });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', async () => {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: userEmail,
          subject: 'Tu Historial de Presión Arterial',
          text: `Adjuntamos tu historial de presión arterial en formato PDF.\n\nAtentamente,\nEl equipo de NoxHealth`,
          attachments: [{ path: filePath }],
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log('PDF enviado por correo a:', userEmail);
          mainWindow.webContents.send('pdf-notification', 'El PDF se ha enviado a tu correo.');
        } catch (error) {
          console.error('Error al enviar PDF por correo:', error);
        }

        resolve(filePath);
      });

      stream.on('error', (error) => {
        console.error('Error al generar PDF:', error.message);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error al exportar PDF:', error.message);
    throw error;
  }
});

ipcMain.handle('exportarCSV', async (event, { from, to }) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T23:59:59`);
    const fromTimestamp = fromDate.getTime();
    const toTimestamp = toDate.getTime();

    const q = query(
      collection(db, 'registros'),
      where('userId', '==', user.uid),
      where('timestamp', '>=', fromTimestamp),
      where('timestamp', '<=', toTimestamp),
      orderBy('timestamp', 'asc')
    );

    const querySnapshot = await getDocs(q);
    let rows = querySnapshot.docs.map(doc => doc.data());

    rows.sort((a, b) => a.timestamp - b.timestamp);

    const csvContent = [
      'Fecha,Hora,Sistólica,Diastólica,Pulso,Comentario',
      ...rows.map(row => `${row.fecha},${row.hora},${row.sistolica},${row.diastolica},${row.pulso},"${row.comentario || ''}"`)
    ].join('\n');

    const filePath = path.join(app.getPath('desktop'), 'Historial_Presion_Arterial.csv');
    fs.writeFileSync(filePath, csvContent);
    return filePath;
  } catch (error) {
    console.error('Error al exportar CSV:', error.message);
    throw error;
  }
});

ipcMain.handle('importCSV', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });

  if (result.canceled) {
    return [];
  }

  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');

  const filePath = result.filePaths[0];
  const records = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(parse({ delimiter: ',', from_line: 2 }))
      .on('data', (row) => {
        const fecha = row[0];
        const hora = row[1];
        const [day, month, year] = fecha.split('/');
        const formattedFecha = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        records.push({
          fecha: formattedFecha,
          hora: hora.padStart(5, '0'),
          sistolica: parseInt(row[2]),
          diastolica: parseInt(row[3]),
          pulso: parseInt(row[4]),
          comentario: row[5],
          userId: user.uid
        });
      })
      .on('end', () => {
        resolve(records);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
});

ipcMain.handle('get-system-theme', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

ipcMain.handle('set-reminder', (event, { type, time }) => {
  const [hours, minutes] = time.split(':');
  const cron = `${minutes} ${hours} * * *`;

  const reminderId = Date.now().toString();
  const job = schedule.scheduleJob(cron, () => {
    const typeText = type === 'measure-pressure' ? 'medir tu presión arterial' : type === 'take-medication' ? 'tomar tu medicamento' : 'cumplir con tu recordatorio';
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: 'Recordatorio de NOX Health',
      text: `Hola, es hora de ${typeText}. ¡Regístralo en la app si es necesario!\n\nAtentamente,\nEl equipo de NoxHealth`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error al enviar recordatorio:', error);
      } else {
        console.log('Recordatorio enviado:', info.response);
        mainWindow.webContents.send('notification', `Recordatorio: Es hora de ${typeText}.`);
      }
    });
  });

  reminders[reminderId] = { id: reminderId, type, time, job };
  console.log(`Recordatorio programado para ${time} con tipo ${type}, ID: ${reminderId}`);
  return reminderId;
});

ipcMain.handle('get-reminders', () => {
  return Object.values(reminders);
});

ipcMain.handle('delete-reminder', (event, reminderId) => {
  if (reminders[reminderId]) {
    reminders[reminderId].job.cancel();
    delete reminders[reminderId];
    console.log(`Recordatorio con ID ${reminderId} eliminado`);
  } else {
    console.warn(`No se encontró un recordatorio con ID: ${reminderId}`);
  }
});

ipcMain.handle('set-alerts', async (event, enabled) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { alertsEnabled: enabled });
    alertsEnabled = enabled;
  } catch (error) {
    console.error('Error al actualizar alerts_enabled:', error.message);
    throw error;
  }
});