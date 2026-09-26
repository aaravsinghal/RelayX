import * as THREE from 'three';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Procedurally generates high-fidelity planetary surface textures using HTML Canvas.
 * Gives rich, detailed 3D visual appearance for all planets without needing external image assets.
 */
export function getProceduralPlanetTexture(planetName: string): THREE.CanvasTexture {
  if (textureCache.has(planetName)) return textureCache.get(planetName)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    return fallback;
  }

  const w = canvas.width;
  const h = canvas.height;

  switch (planetName) {
    case 'Sun': {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w / 2);
      grad.addColorStop(0, '#fff5cc');
      grad.addColorStop(0.3, '#ffcc00');
      grad.addColorStop(0.7, '#ff6600');
      grad.addColorStop(1, '#cc2200');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Solar granulation noise
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < 4000; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'Mercury': {
      ctx.fillStyle = '#6b6865';
      ctx.fillRect(0, 0, w, h);

      // Craters & noise
      ctx.fillStyle = 'rgba(40, 40, 40, 0.4)';
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 4 + 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(180, 180, 180, 0.2)';
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 2 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'Venus': {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#e3c298');
      grad.addColorStop(0.3, '#c29b67');
      grad.addColorStop(0.6, '#e8cfaa');
      grad.addColorStop(1, '#b89058');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Atmospheric cloud swirls
      ctx.fillStyle = 'rgba(255, 245, 220, 0.2)';
      for (let i = 0; i < 60; i++) {
        const y = Math.random() * h;
        ctx.beginPath();
        ctx.ellipse(Math.random() * w, y, Math.random() * 180 + 50, Math.random() * 15 + 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'Earth': {
      // Ocean base
      ctx.fillStyle = '#0f3c78';
      ctx.fillRect(0, 0, w, h);

      // Deep ocean variations
      ctx.fillStyle = '#0b2a54';
      for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * w, Math.random() * h, Math.random() * 200 + 100, Math.random() * 80 + 40, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Continents (green/brown patches)
      ctx.fillStyle = '#2d6a4f';
      const continents = [
        { x: w * 0.2, y: h * 0.35, rx: 120, ry: 70 }, // N America
        { x: w * 0.28, y: h * 0.65, rx: 70, ry: 100 }, // S America
        { x: w * 0.52, y: h * 0.45, rx: 100, ry: 90 }, // Africa
        { x: w * 0.55, y: h * 0.25, rx: 140, ry: 60 }, // Europe/Asia
        { x: w * 0.8, y: h * 0.7, rx: 70, ry: 50 }, // Australia
      ];
      for (const c of continents) {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx, c.ry, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Arid land interiors
        ctx.fillStyle = '#8c764b';
        ctx.beginPath();
        ctx.ellipse(c.x + 10, c.y + 5, c.rx * 0.5, c.ry * 0.5, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2d6a4f';
      }

      // Polar ice caps
      ctx.fillStyle = '#f0f8ff';
      ctx.fillRect(0, 0, w, h * 0.08); // North Pole
      ctx.fillRect(0, h * 0.92, w, h * 0.08); // South Pole

      // Cloud layer wisps
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let i = 0; i < 80; i++) {
        const y = Math.random() * h;
        ctx.beginPath();
        ctx.ellipse(Math.random() * w, y, Math.random() * 140 + 40, Math.random() * 12 + 3, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'Mars': {
      // Rust orange base
      ctx.fillStyle = '#b7410e';
      ctx.fillRect(0, 0, w, h);

      // Darker basaltic regions
      ctx.fillStyle = '#7a2805';
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * w, Math.random() * h, Math.random() * 100 + 30, Math.random() * 40 + 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ice caps
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, 12, 120, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h - 12, 100, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'Jupiter': {
      // Gas giant cloud bands
      const bandColors = ['#d8b88d', '#a37c56', '#e6cbab', '#8c5e38', '#d1aa82', '#9e6d43', '#e0c4a4'];
      const bandHeight = h / bandColors.length;
      for (let i = 0; i < bandColors.length; i++) {
        ctx.fillStyle = bandColors[i];
        ctx.fillRect(0, i * bandHeight, w, bandHeight);
      }

      // Swirl turbulence
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let i = 0; i < 100; i++) {
        const y = Math.random() * h;
        ctx.beginPath();
        ctx.ellipse(Math.random() * w, y, Math.random() * 120 + 30, Math.random() * 8 + 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Great Red Spot
      ctx.fillStyle = '#b33619';
      ctx.beginPath();
      ctx.ellipse(w * 0.6, h * 0.65, 55, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e66743';
      ctx.beginPath();
      ctx.ellipse(w * 0.6, h * 0.65, 35, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'Saturn': {
      // Soft golden stripes
      const bandColors = ['#e3cf9a', '#c4ac74', '#eddca6', '#b5975b', '#e8d7a7'];
      const bandHeight = h / bandColors.length;
      for (let i = 0; i < bandColors.length; i++) {
        ctx.fillStyle = bandColors[i];
        ctx.fillRect(0, i * bandHeight, w, bandHeight);
      }
      break;
    }

    case 'Uranus': {
      // Cyan ice giant gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#86cbd4');
      grad.addColorStop(0.5, '#56b1be');
      grad.addColorStop(1, '#77c3ce');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }

    case 'Neptune': {
      // Deep blue azure gas giant
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#3b62d1');
      grad.addColorStop(0.5, '#2044aa');
      grad.addColorStop(1, '#3358c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // White cirrus methane cloud streaks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(w * 0.3, h * 0.4, 80, 6, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.7, h * 0.7, 110, 8, -0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    default: {
      ctx.fillStyle = '#888888';
      ctx.fillRect(0, 0, w, h);
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(planetName, texture);
  return texture;
}

/** Procedural ring texture for Saturn/Uranus */
export function getProceduralRingTexture(): THREE.CanvasTexture {
  if (textureCache.has('Ring')) return textureCache.get('Ring')!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, 'rgba(216, 201, 160, 0.0)');
  grad.addColorStop(0.15, 'rgba(216, 201, 160, 0.8)');
  grad.addColorStop(0.4, 'rgba(180, 160, 120, 0.5)');
  grad.addColorStop(0.5, 'rgba(225, 210, 170, 0.9)');
  grad.addColorStop(0.75, 'rgba(190, 175, 135, 0.6)');
  grad.addColorStop(0.9, 'rgba(150, 135, 100, 0.3)');
  grad.addColorStop(1, 'rgba(120, 100, 70, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 1);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('Ring', texture);
  return texture;
}
