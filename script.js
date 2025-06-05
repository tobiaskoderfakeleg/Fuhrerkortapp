// Register the service worker if supported
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => {
      console.log('Service Worker registered:', reg);
    })
    .catch(err => {
      console.warn('Service Worker registration failed:', err);
    });
}

// Show an offline banner when the network is unavailable
function updateOnlineStatus() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;
  banner.style.display = navigator.onLine ? 'none' : 'block';
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
// Forsikre at DOM er lastet
document.addEventListener('DOMContentLoaded', () => {
  updateOnlineStatus();
  // Element-pekere
  const pinBoxes = Array.from(document.querySelectorAll('#pin-view .pin-box'));
  pinBoxes[0].focus();  // Autofokus på første PIN-boks
  const pinView = document.getElementById('pin-view');
  const mainScreen = document.getElementById('main-screen');
  const licenseScreen = document.getElementById('license-screen');
  const screen2 = document.getElementById('screen2');
  const screen3 = document.getElementById('screen3');
  const dailyNumberEl = document.getElementById('daily-number');

  // Keep track of the "starting" orientation values so we can
  // calculate how far the phone has moved relative to that point.
  const tiltState = {
    gammaBase: null, // reference angle for the left/right tilt
    betaBase: null   // reference angle for the forward/back tilt
  };

  // Cache frequently used elements
  const holoMain = document.getElementById('holo-main');
  const holoLicense = document.getElementById('holo-license');
  const holoControl = document.getElementById('holo-control');
  const holoBar = document.getElementById('holo-bar');
  const lineNorge = document.getElementById('line-norge');
  const lineNoreg = document.getElementById('line-noreg');
  const ctrlNorge = document.getElementById('ctrl-norge');
  const ctrlNoreg = document.getElementById('ctrl-noreg');
  const profilePic = document.getElementById('profile-pic');

  // Reset reference orientation when switching screens or
  // after permission is granted so that the current device
  // position becomes the new "zero" point for calculations.
  function resetTiltState() {
    tiltState.gammaBase = null;
    tiltState.betaBase = null;
  }

  // Helper to keep angle differences within the -180 → 180 range
  function angleDiff(current, base) {
    let diff = current - base;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  }

  // Clamp a number between a minimum and maximum value
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Create an orientation handler for a set of hologram elements.
   * Each handler remembers the initial device orientation and then
   * updates the UI relative to that starting position.
   */
  function createOrientationHandler(opts = {}) {
    const { square, norge, noreg, bar } = opts;
    return e => {
      // Remember the orientation at the moment the handler starts so
      // all calculations are relative to that position.
      if (tiltState.gammaBase === null) tiltState.gammaBase = e.gamma;
      if (tiltState.betaBase === null) tiltState.betaBase = e.beta;

      // ----- Type 1: rotating square opacity (gamma axis) -----
      const gDiff = angleDiff(e.gamma, tiltState.gammaBase);
      const gProg = clamp(Math.abs(gDiff) / 40, 0, 1); // 0 → 1 over 40°
      if (square) {
        const opacity = 0.3 + gProg * 0.4; // 30% → 70%
        square.style.backgroundColor = `rgba(0,0,0,${opacity.toFixed(2)})`;
      }

      // ----- Type 2: two line text fade (beta axis) -----
      const bDiff = angleDiff(e.beta, tiltState.betaBase);
      const bProg = clamp(bDiff / 35, -1, 1); // -1 ← 35° → 1
      if (norge && noreg) {
        if (bProg >= 0) {
          // Tilting away from user
          norge.style.opacity = (0.3 + 0.4 * bProg).toFixed(2);
          noreg.style.opacity = (0.7 - 0.4 * bProg).toFixed(2);
        } else {
          // Tilting towards user
          norge.style.opacity = (0.7 - 0.4 * bProg).toFixed(2);
          noreg.style.opacity = (0.3 + 0.4 * bProg).toFixed(2);
        }
      }

      // ----- Type 3: color bar (beta axis magnitude) -----
      if (bar) {
        const barProg = clamp(Math.abs(bDiff) / 35, 0, 1);
        const g = Math.round(255 * (1 - barProg));
        bar.style.backgroundColor = `rgb(255, ${g}, 0)`;
      }
    };
  }

  // A quick helper to remember in this session whether we've already asked for and received DeviceOrientation permission.
function hasHoloPermission() {
  return sessionStorage.getItem('holoGranted') === 'true';
}

function markHoloPermissionGranted() {
  sessionStorage.setItem('holoGranted', 'true');
}

function startHologram() {
  // If we've already gotten permission earlier this session, skip straight to listening:
  if (hasHoloPermission()) {
    resetTiltState();
    window.addEventListener('deviceorientation', handleOrientationMain);
    return;
  }

  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    // iOS 13+ path
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          // Remember for the rest of this session:
          markHoloPermissionGranted();
          resetTiltState();
          window.addEventListener('deviceorientation', handleOrientationMain);
        } else {
          alert('Du må gi bevegelses­tillatelse for hologram‐effekten');
        }
      })
      .catch(err => {
        console.warn('Motion permission error:', err);
      });
  } else {
    // Non‐iOS or older browsers—no prompt needed
    markHoloPermissionGranted();
    resetTiltState();
    window.addEventListener('deviceorientation', handleOrientationMain);
  }
}

  // PIN-input og navigasjon til hovedskjerm
  pinBoxes.forEach((box, idx) => {
    box.addEventListener('input', e => {
      const value = e.target.value;
      if (/^[0-9]$/.test(value)) {
        if (idx < pinBoxes.length - 1) {
          pinBoxes[idx + 1].focus();
        } else {
          const kode = pinBoxes.map(b => b.value).join('');
          if (kode.length === 4) {
            pinBoxes.forEach(b => b.value = '');
            pinView.classList.remove('active');
            mainScreen.classList.add('active');
            startHologram();
          }
        }
      } else {
        e.target.value = '';
      }
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        pinBoxes[idx - 1].focus();
      }
    });
  });


  // 4) Main‐screen button listeners (with no back‐from‐main anymore)…
  document.getElementById('btn-top').addEventListener('click', () => {
    mainScreen.classList.remove('active');
    licenseScreen.classList.add('active');
    updateTimestamp();
    // When you leave mainScreen → licenseScreen, remove main hologram:
    window.removeEventListener('deviceorientation', handleOrientationMain);
    if (hasHoloPermission()) {
      resetTiltState();
      window.addEventListener('deviceorientation', handleOrientationLicense);
    }
  });
  document.getElementById('btn-bottom').addEventListener('click', () => {
    alert('Skann QR-kode funksjon ikke implementert');
  });
  document.getElementById('profile-btn-main').addEventListener('click', () => {
    alert('Profil-skjerm kommer senere');
  });


  // 5) License‐screen listeners
  document.getElementById('back-from-license').addEventListener('click', () => {
    licenseScreen.classList.remove('active');
    mainScreen.classList.add('active');
    window.removeEventListener('deviceorientation', handleOrientationLicense);
    // If holo was already granted, re‐attach main listener
    if (hasHoloPermission()) {
      resetTiltState();
      window.addEventListener('deviceorientation', handleOrientationMain);
    }
  });
  if (profilePic) {
    profilePic.addEventListener('click', () => {
      window.open(profilePic.src, '_blank');
    });
  }
  document.getElementById('control-btn').addEventListener('click', () => {
    licenseScreen.classList.remove('active');
    screen2.classList.add('active');
    window.removeEventListener('deviceorientation', handleOrientationLicense);
    if (hasHoloPermission()) {
      resetTiltState();
      window.addEventListener('deviceorientation', handleOrientationControl);
    }
    updateDailyNumber();
    updateTimestamp('kontroll-updated');
  });

// 6) Screen2 listeners
  document.getElementById('back-from-screen2').addEventListener('click', () => {
    screen2.classList.remove('active');
    licenseScreen.classList.add('active');
    window.removeEventListener('deviceorientation', handleOrientationControl);
    if (hasHoloPermission()) {
      resetTiltState();
      window.addEventListener('deviceorientation', handleOrientationLicense);
    }
  });


  // 7) Screen3 back listener (no hologram here)
  document.getElementById('back-from-screen3').addEventListener('click', () => {
    screen3.classList.remove('active');
    screen2.classList.add('active');
  });

const handleOrientationMain = createOrientationHandler({
  square: holoMain,
  norge: lineNorge,
  noreg: lineNoreg
});

const handleOrientationLicense = createOrientationHandler({
  square: holoLicense,
  bar: holoBar
});

const handleOrientationControl = createOrientationHandler({
  square: holoControl,
  norge: ctrlNorge,
  noreg: ctrlNoreg
});

  // Update the "Sist oppdatert" timestamp on the license screen
  function updateTimestamp(id = 'updated-time') {
    const el = document.getElementById(id);
    if (!el) return;
    const now = new Date();
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    };
    el.textContent = 'Sist oppdatert: ' +
      now.toLocaleString('no-NO', options).replace(',', '');
  }

  function updateDailyNumber() {
    if (!dailyNumberEl) return;
    let n = sessionStorage.getItem('dailyNumber');
    if (!n) {
      n = Math.floor(Math.random() * 898) + 101; // range 101-998
      sessionStorage.setItem('dailyNumber', n);
    }
    dailyNumberEl.textContent = n;
  }
  
  // 9) Reset transforms when screens switch
  function resetTransforms() {
    // All hologram squares start at 30% opacity
    if (holoMain) holoMain.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    if (holoLicense) holoLicense.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    if (holoControl) holoControl.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';

    // Text holograms default with Noreg visible and Norge faded
    if (lineNorge && lineNoreg) {
      lineNorge.style.opacity = '0.3';
      lineNoreg.style.opacity = '0.7';
    }
    if (ctrlNorge && ctrlNoreg) {
      ctrlNorge.style.opacity = '0.3';
      ctrlNoreg.style.opacity = '0.7';
    }

    // Color bar starts yellow
    if (holoBar) holoBar.style.backgroundColor = 'rgb(255, 255, 0)';

    resetTiltState();
  }
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.attributeName === 'class') resetTransforms();
    }
  });
  observer.observe(mainScreen, { attributes: true });
  observer.observe(screen2, { attributes: true });
  observer.observe(licenseScreen, { attributes: true });
});
