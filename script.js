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
// Forsikre at DOM er lastet
document.addEventListener('DOMContentLoaded', () => {
  // Element-pekere
  const pinBoxes = Array.from(document.querySelectorAll('#pin-view .pin-box'));
  pinBoxes[0].focus();  // Autofokus på første PIN-boks
  const pinView = document.getElementById('pin-view');
  const mainScreen = document.getElementById('main-screen');
  const licenseScreen = document.getElementById('license-screen');
  const screen2 = document.getElementById('screen2');
  const screen3 = document.getElementById('screen3');

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
    // If holo was already granted, re‐attach main listener
    if (hasHoloPermission()) {
      window.addEventListener('deviceorientation', handleOrientationMain);
    }
  });
  document.getElementById('profile-pic').addEventListener('click', () => {
    window.open(document.getElementById('profile-pic').src, '_blank');
  });
  document.getElementById('control-btn').addEventListener('click', () => {
    licenseScreen.classList.remove('active');
    screen2.classList.add('active');
    // When entering screen2, attach the second hologram listener if permission granted
    if (hasHoloPermission()) {
      window.addEventListener('deviceorientation', handleOrientation2);
    }
  });

// 6) Screen2 listeners
  document.getElementById('back-from-screen2').addEventListener('click', () => {
    screen2.classList.remove('active');
    licenseScreen.classList.add('active');
    // Remove screen2 listener so it stops firing:
    window.removeEventListener('deviceorientation', handleOrientation2);
  });
  document.getElementById('clickable-image').addEventListener('click', () => {
    screen2.classList.remove('active');
    screen3.classList.add('active');
    // Remove screen2 listener
    window.removeEventListener('deviceorientation', handleOrientation2);
  });
  document.getElementById('btn-to-screen3').addEventListener('click', () => {
    screen2.classList.remove('active');
    screen3.classList.add('active');
    // Remove screen2 listener
    window.removeEventListener('deviceorientation', handleOrientation2);
  });


  // 7) Screen3 back listener (no hologram here)
  document.getElementById('back-from-screen3').addEventListener('click', () => {
    screen3.classList.remove('active');
    screen2.classList.add('active');
    // When returning to screen2, re‐attach its listener if permitted:
    if (hasHoloPermission()) {
      window.addEventListener('deviceorientation', handleOrientation2);
    }
  });

  // Hologram-tilt
function handleOrientationMain(e) {
  const x = e.beta;   // -180 … 180 (front/back)
  const y = e.gamma;  // -90 … 90 (left/right)
  const holo = document.getElementById('holo-main');

  // 1) Keep the existing 3D tilt effect:
  holo.style.transform = `translate(-50%, -50%) rotateX(${x / 2}deg) rotateY(${y / 2}deg)`;

  // 2) Now check thresholds to pick a “hologram color”:
  //    - tilt backward  (phone top leans away from you) → beta > 30
  //    - tilt forward   (phone top leans toward you)  → beta < -30
  //    - tilt right     (phone right side down)       → gamma > 30
  //    - tilt left      (phone left side down)        → gamma < -30
  //
  //  Feel free to adjust 30° to any sensitivity you like.

  if (x > 30) {
    // leaning backward
    holo.style.backgroundColor = 'green';
  } else if (x < -30) {
    // leaning forward
    holo.style.backgroundColor = 'red';
  } else if (y > 30) {
    // tilted to the right
    holo.style.backgroundColor = 'blue';
  } else if (y < -30) {
    // tilted to the left
    holo.style.backgroundColor = 'purple';
  } else {
    // nearly flat—use default “blue‐ish” circle
    holo.style.backgroundColor = 'rgba(0, 122, 255, 0.5)';
  }
}
function handleOrientation2(e) {
  const x = e.beta;   // -180 … 180 (front/back)
  const y = e.gamma;  // -90 … 90 (left/right)
  const holo = document.getElementById('holo-2');

  // 1) Keep the existing 3D tilt effect:
  holo.style.transform = `translate(-50%, -50%) rotateX(${x / 2}deg) rotateY(${y / 2}deg)`;

  // 2) Now check thresholds to pick a “hologram color”:
  //    - tilt backward  (phone top leans away from you) → beta > 30
  //    - tilt forward   (phone top leans toward you)  → beta < -30
  //    - tilt right     (phone right side down)       → gamma > 30
  //    - tilt left      (phone left side down)        → gamma < -30
  //
  //  Feel free to adjust 30° to any sensitivity you like.

  if (x > 30) {
    // leaning backward
    holo.style.backgroundColor = 'green';
  } else if (x < -30) {
    // leaning forward
    holo.style.backgroundColor = 'red';
  } else if (y > 30) {
    // tilted to the right
    holo.style.backgroundColor = 'blue';
  } else if (y < -30) {
    // tilted to the left
    holo.style.backgroundColor = 'purple';
  } else {
    // nearly flat—use default “blue‐ish” circle
    holo.style.backgroundColor = 'rgba(0, 122, 255, 0.5)';
  }
}

  // Update the "Sist oppdatert" timestamp on the license screen
  function updateTimestamp() {
    const el = document.getElementById('updated-time');
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

  // 9) Reset transforms when screens switch
  function resetTransforms() {
    document.getElementById('holo-main').style.transform =
      'translate(-50%, -50%) rotateX(0deg) rotateY(0deg)';
    document.getElementById('holo-2').style.transform =
      'translate(-50%, -50%) rotateX(0deg) rotateY(0deg)';
  }
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.attributeName === 'class') resetTransforms();
    }
  });
  observer.observe(mainScreen, { attributes: true });
  observer.observe(screen2, { attributes: true });
});
