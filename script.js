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

  const tiltState = {
    gamma: { last: null, offset: 0 },
    beta:  { last: null, offset: 0 }
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

  function resetTiltState() {
    tiltState.gamma.last = null;
    tiltState.gamma.offset = 0;
    tiltState.beta.last = null;
    tiltState.beta.offset = 0;
  }

  function updateAxis(state, value, max) {
    if (state.last === null) {
      state.last = value;
      state.offset = 0;
      return 0;
    }

    let delta = value - state.last;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    state.last = value;

    if (Math.abs(delta) < 0.5) delta = 0;

    state.offset += delta;

    if (Math.abs(state.offset) < 1) state.offset = 0;
    if (state.offset > max) state.offset = max;
    if (state.offset < -max) state.offset = -max;

    return state.offset;
  }

  function applyDeadZone(value, threshold = 1.5) {
    return Math.abs(value) < threshold ? 0 : value;
  }

  function createOrientationHandler(holo, opts = {}) {
    const { norge, noreg, bar } = opts;
    return e => {
      const diffGamma = applyDeadZone(updateAxis(tiltState.gamma, e.gamma, 20));
      const holoOpacity = diffGamma >= 0
        ? 0.3 + (diffGamma / 20) * 0.45
        : 0.75 + (diffGamma / 20) * 0.45;
      if (holo) {
        holo.style.backgroundColor = `rgba(0, 0, 0, ${holoOpacity.toFixed(2)})`;
      }

      const diffBeta = applyDeadZone(updateAxis(tiltState.beta, e.beta, 30));
      const prog = Math.abs(diffBeta) / 30;

      if (bar) {
        const g = diffBeta >= 0
          ? Math.round(255 * (1 - prog))
          : Math.round(255 * prog);
        bar.style.backgroundColor = `rgb(255, ${g}, 0)`;
      }

      if (norge && noreg) {
        if (diffBeta >= 0) {
          norge.style.opacity = (0.80 - 0.45 * prog).toFixed(2);
          noreg.style.opacity = (0.35 + 0.45 * prog).toFixed(2);
        } else {
          norge.style.opacity = (0.35 + 0.45 * prog).toFixed(2);
          noreg.style.opacity = (0.80 - 0.45 * prog).toFixed(2);
        }
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

const handleOrientationMain = createOrientationHandler(holoMain, {
  norge: lineNorge,
  noreg: lineNoreg
});

const handleOrientationLicense = createOrientationHandler(holoLicense, {
  bar: holoBar
});

const handleOrientationControl = createOrientationHandler(holoControl, {
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
    const n = Math.floor(Math.random() * 898) + 101; // range 101-998
    dailyNumberEl.textContent = n;
  }
  
  // 9) Reset transforms when screens switch
  function resetTransforms() {
    if (holoMain) holoMain.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    if (holoLicense) holoLicense.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    if (holoControl) holoControl.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
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
