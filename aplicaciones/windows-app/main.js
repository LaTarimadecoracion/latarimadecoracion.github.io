const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;

// Set custom unique user data path to avoid profile lock collisions
app.setPath('userData', path.join(app.getPath('appData'), 'LaTarimaAppProfile'));

// Lock single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

function createWindow() {
  const iconPath = path.join(__dirname, '../../img/icon-192.png');
  const appIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : null;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'La Tarima Decoración',
    icon: appIcon && !appIcon.isEmpty() ? appIcon : undefined,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true
    }
  });

  // Target local web application entry point
  const localIndexPath = path.join(__dirname, '../../index.html');
  
  if (fs.existsSync(localIndexPath)) {
    mainWindow.loadFile(localIndexPath);
  } else {
    mainWindow.loadURL('https://latarimadecoracion.com');
  }

  // Create native menu
  createMenu();

  // Create system tray icon
  createTray(appIcon);

  // Handle IPC window controls
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow.close());
  ipcMain.on('window-reload', () => mainWindow.reload());

  // Handle external links opening in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'Navegación',
      submenu: [
        { label: 'Inicio', accelerator: 'CmdOrCtrl+H', click: () => {
            const localIndexPath = path.join(__dirname, '../../index.html');
            if (fs.existsSync(localIndexPath)) mainWindow.loadFile(localIndexPath);
          } 
        },
        { label: 'Recargar vista', accelerator: 'F5', click: () => mainWindow.reload() },
        { label: 'Forzar Recarga', accelerator: 'CmdOrCtrl+F5', click: () => mainWindow.webContents.reloadIgnoringCache() },
        { type: 'separator' },
        { label: 'Salir de la App', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Pantalla Completa', role: 'togglefullscreen' },
        { label: 'Acercar Zoom', role: 'zoomIn' },
        { label: 'Alejar Zoom', role: 'zoomOut' },
        { label: 'Restablecer Zoom', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Herramientas de Desarrollador', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de La Tarima App',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'La Tarima Decoración - App Windows',
              message: 'La Tarima Decoración v1.0.0',
              detail: 'Aplicación híbrida oficial para Windows 10 y Windows 11.\nConexión directa e instantánea con la plataforma web.',
              buttons: ['Aceptar']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createTray(appIcon) {
  if (!appIcon || appIcon.isEmpty()) return;
  try {
    tray = new Tray(appIcon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Mostrar La Tarima App', click: () => mainWindow.show() },
      { label: 'Recargar web', click: () => mainWindow.reload() },
      { type: 'separator' },
      { label: 'Cerrar App', click: () => app.quit() }
    ]);
    tray.setToolTip('La Tarima Decoración - Windows App');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow.show());
  } catch (e) {
    // Tray optional fallback
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
