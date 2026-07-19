/**
 * CircularGallery — Vanilla JS (ported from React Bits)
 * Uses OGL for WebGL rendering of a curved, scrollable image gallery.
 * Requires: https://cdn.jsdelivr.net/npm/ogl@1.0.8/dist/ogl.mjs
 */

const OGL_CDN = 'https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm';
let _ogl = null;

async function loadOGL() {
  if (_ogl) return _ogl;
  _ogl = await import(OGL_CDN);
  return _ogl;
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function lerp(p1, p2, t) { return p1 + (p2 - p1) * t; }

function getFontSize(font) {
  const m = font.match(/(\d+)px/);
  return m ? parseInt(m[1], 10) : 30;
}

function createTextTexture(gl, Texture, text, font, color) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = font;
  const tw = Math.ceil(ctx.measureText(text).width);
  const th = Math.ceil(getFontSize(font) * 1.2);
  c.width = tw + 20; c.height = th + 20;
  ctx.font = font; ctx.fillStyle = color;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillText(text, c.width / 2, c.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = c;
  return { texture, width: c.width, height: c.height };
}

class Title {
  constructor({ gl, plane, renderer, text, textColor, font, OGL }) {
    this.gl = gl; this.plane = plane; this.text = text;
    const { texture, width, height } = createTextTexture(gl, OGL.Texture, text, font, textColor);
    const geometry = new OGL.Plane(gl);
    const program = new OGL.Program(gl, {
      vertex: `attribute vec3 position;attribute vec2 uv;uniform mat4 modelViewMatrix;uniform mat4 projectionMatrix;varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragment: `precision highp float;uniform sampler2D tMap;varying vec2 vUv;void main(){vec4 c=texture2D(tMap,vUv);if(c.a<0.1)discard;gl_FragColor=c;}`,
      uniforms: { tMap: { value: texture } },
      transparent: true
    });
    this.mesh = new OGL.Mesh(gl, { geometry, program });
    const aspect = width / height;
    const textH = plane.scale.y * 0.15;
    this.mesh.scale.set(textH * aspect, textH, 1);
    this.mesh.position.y = -plane.scale.y * 0.5 - textH * 0.5 - 0.05;
    this.mesh.setParent(plane);
  }
}

class Media {
  constructor({ geometry, gl, image, index, length, renderer, scene, screen, text, viewport, bend, textColor, borderRadius, font, OGL }) {
    this.extra = 0; this.geometry = geometry; this.gl = gl; this.image = image;
    this.index = index; this.length = length; this.renderer = renderer;
    this.scene = scene; this.screen = screen; this.text = text;
    this.viewport = viewport; this.bend = bend; this.textColor = textColor;
    this.borderRadius = borderRadius; this.font = font; this.OGL = OGL;
    this.speed = 0; this.isBefore = false; this.isAfter = false;
    this.uWinningTarget = 0.0;
    this.uWinningCurrent = 0.0;
    this.createShader(); this.createMesh(); this.createTitle(); this.onResize();
  }

  createShader() {
    const { Texture, Program } = this.OGL;
    const texture = new Texture(this.gl, { generateMipmaps: true });
    this.program = new Program(this.gl, {
      depthTest: false, depthWrite: false,
      vertex: `precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 modelViewMatrix;uniform mat4 projectionMatrix;uniform float uTime;uniform float uSpeed;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.z=uTime*0.0+uSpeed*0.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
      fragment: `precision highp float;uniform vec2 uImageSizes;uniform vec2 uPlaneSizes;uniform sampler2D tMap;uniform float uBorderRadius;uniform float uWinning;varying vec2 vUv;float roundedBoxSDF(vec2 p,vec2 b,float r){vec2 d=abs(p)-b;return length(max(d,vec2(0.0)))+min(max(d.x,d.y),0.0)-r;}void main(){vec2 ratio=vec2(min((uPlaneSizes.x/uPlaneSizes.y)/(uImageSizes.x/uImageSizes.y),1.0),min((uPlaneSizes.y/uPlaneSizes.x)/(uImageSizes.y/uImageSizes.x),1.0));vec2 uv=vec2(vUv.x*ratio.x+(1.0-ratio.x)*0.5,vUv.y*ratio.y+(1.0-ratio.y)*0.5);vec4 color=texture2D(tMap,uv);float d=roundedBoxSDF(vUv-0.5,vec2(0.5-uBorderRadius),uBorderRadius);float alpha=1.0-smoothstep(-0.002,0.002,d);vec4 finalColor=vec4(color.rgb,alpha);if(d>0.0){float glow=smoothstep(0.06,0.0,d);finalColor=vec4(vec3(0.96,0.62,0.04),glow*uWinning);}else{float innerGlow=smoothstep(-0.03,0.0,d);finalColor.rgb=mix(finalColor.rgb,vec3(0.96,0.62,0.04),innerGlow*uWinning*0.55);}gl_FragColor=finalColor;}`,
      uniforms: {
        tMap: { value: texture }, uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] }, uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() }, uBorderRadius: { value: this.borderRadius },
        uWinning: { value: 0.0 }
      },
      transparent: true
    });
    const img = new Image();
    img.crossOrigin = 'anonymous'; img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  createMesh() {
    this.plane = new this.OGL.Mesh(this.gl, { geometry: this.geometry, program: this.program });
    this.plane.setParent(this.scene);
  }

  createTitle() {
    this.title = new Title({
      gl: this.gl, plane: this.plane, renderer: this.renderer,
      text: this.text, textColor: this.textColor, font: this.font, OGL: this.OGL
    });
  }

  update(scroll, direction) {
    this.uWinningCurrent += (this.uWinningTarget - this.uWinningCurrent) * 0.08;
    this.program.uniforms.uWinning.value = this.uWinningCurrent;

    const winningFactor = 1.0 + this.uWinningCurrent * 0.08;
    this.plane.scale.y = this.baseScaleY * winningFactor;
    this.plane.scale.x = this.baseScaleX * winningFactor;

    this.plane.position.x = this.x - scroll.current - this.extra;
    const x = this.plane.position.x;
    const H = this.viewport.width / 2;
    if (this.bend === 0) { this.plane.position.y = 0; this.plane.rotation.z = 0; }
    else {
      const B = Math.abs(this.bend);
      const R = (H * H + B * B) / (2 * B);
      const eX = Math.min(Math.abs(x), H);
      const arc = R - Math.sqrt(R * R - eX * eX);
      if (this.bend > 0) { this.plane.position.y = -arc; this.plane.rotation.z = -Math.sign(x) * Math.asin(eX / R); }
      else { this.plane.position.y = arc; this.plane.rotation.z = Math.sign(x) * Math.asin(eX / R); }
    }
    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;
    const po = this.plane.scale.x / 2, vo = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + po < -vo;
    this.isAfter = this.plane.position.x - po > vo;
    if (direction === 'right' && this.isBefore) { this.extra -= this.widthTotal; this.isBefore = this.isAfter = false; }
    if (direction === 'left' && this.isAfter) { this.extra += this.widthTotal; this.isBefore = this.isAfter = false; }
  }

  onResize({ screen, viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;
    this.scale = this.screen.height / 1500;
    
    this.baseScaleY = (this.viewport.height * (900 * this.scale)) / this.screen.height;
    this.baseScaleX = (this.viewport.width * (700 * this.scale)) / this.screen.width;

    const winningFactor = 1.0 + this.uWinningCurrent * 0.08;
    this.plane.scale.y = this.baseScaleY * winningFactor;
    this.plane.scale.x = this.baseScaleX * winningFactor;

    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.padding = 2;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

class GalleryApp {
  constructor(container, { items, bend = 3, textColor = '#ffffff', borderRadius = 0.05, font = 'bold 24px DM Sans', scrollSpeed = 2, scrollEase = 0.05, onCardClick }, OGL) {
    this.container = container;
    this.OGL = OGL;
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(this.onCheck.bind(this), 200);
    this.medias = [];
    this.isDown = false; this.start = 0; this.raf = 0;
    this.onCardClick = onCardClick;
    this.originalLength = items ? items.length : 0;
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(items, bend, textColor, borderRadius, font);
    this.update();
    this.addEventListeners();
  }

  createRenderer() {
    this.renderer = new this.OGL.Renderer({ alpha: true, antialias: true, dpr: Math.min(devicePixelRatio || 1, 2) });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas);
  }

  createCamera() {
    this.camera = new this.OGL.Camera(this.gl);
    this.camera.fov = 45; this.camera.position.z = 20;
  }

  createScene() { this.scene = new this.OGL.Transform(); }

  createGeometry() { this.planeGeometry = new this.OGL.Plane(this.gl, { heightSegments: 50, widthSegments: 100 }); }

  createMedias(items, bend, textColor, borderRadius, font) {
    const gallery = items && items.length ? items : [];
    this.mediasImages = gallery.concat(gallery);
    this.medias = this.mediasImages.map((data, index) =>
      new Media({ geometry: this.planeGeometry, gl: this.gl, image: data.image, index, length: this.mediasImages.length, renderer: this.renderer, scene: this.scene, screen: this.screen, text: data.text, viewport: this.viewport, bend, textColor, borderRadius, font, OGL: this.OGL })
    );
  }

  onTouchDown(e) { this.isDown = true; this.scroll.position = this.scroll.current; this.start = e.touches ? e.touches[0].clientX : e.clientX; }
  onTouchMove(e) { if (!this.isDown) return; const x = e.touches ? e.touches[0].clientX : e.clientX; this.scroll.target = (this.scroll.position || 0) + (this.start - x) * this.scrollSpeed * 0.025; }
  onTouchUp() { this.isDown = false; this.onCheck(); }

  onWheel(e) {
    const d = e.deltaY || e.wheelDelta || e.detail;
    this.scroll.target += (d > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounce();
  }

  onCheck() {
    if (!this.medias[0]) return;
    const w = this.medias[0].width;
    const idx = Math.round(Math.abs(this.scroll.target) / w);
    this.scroll.target = this.scroll.target < 0 ? -(w * idx) : w * idx;
  }

  onResize() {
    const w = this.container.clientWidth || 100;
    const h_px = this.container.clientHeight || 100;
    this.screen = { width: w, height: h_px };
    this.renderer.setSize(w, h_px);
    const aspect = w / h_px;
    this.camera.perspective({ aspect });
    const fov = (this.camera.fov * Math.PI) / 180;
    const h = 2 * Math.tan(fov / 2) * this.camera.position.z;
    this.viewport = { width: h * aspect, height: h };
    if (this.medias) this.medias.forEach(m => m.onResize({ screen: this.screen, viewport: this.viewport }));
  }

  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const dir = this.scroll.current > this.scroll.last ? 'right' : 'left';
    if (this.medias) this.medias.forEach(m => m.update(this.scroll, dir));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;

    // Check if programmatic spin has settled on target
    if (this.isSpinning && Math.abs(this.scroll.target - this.scroll.current) < 0.8) {
      this.scroll.current = this.scroll.target; // Snap to exact target
      this.isSpinning = false;
      if (typeof this.onSpinEnd === 'function') {
        this.onSpinEnd();
      }
    }

    this.raf = requestAnimationFrame(this.update.bind(this));
  }

  addEventListeners() {
    this._onResize = this.onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this._onClick = (e) => {
      if (this.isSpinning) return;
      const rect = this.renderer.gl.canvas.getBoundingClientRect();
      const mouse = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1
      };

      const raycast = new this.OGL.Raycast(this.gl);
      raycast.castMouse(this.camera, mouse);

      const meshes = this.medias.map(m => m.plane);
      const hits = raycast.intersectBounds(meshes);

      if (hits.length > 0) {
        const hitMesh = hits[0];
        const clickedMedia = this.medias.find(m => m.plane === hitMesh);
        if (clickedMedia && typeof this.onCardClick === 'function') {
          const N = this.originalLength;
          if (N > 0) {
            const origIdx = clickedMedia.index % N;
            this.onCardClick(origIdx);
          }
        }
      }
    };
    this.container.addEventListener('click', this._onClick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
    if (this._onClick) {
      this.container.removeEventListener('click', this._onClick);
    }
    if (this.gl && this.gl.canvas && this.gl.canvas.parentNode) {
      this.gl.canvas.parentNode.removeChild(this.gl.canvas);
    }
  }
}

/**
 * Initialize a CircularGallery in a container element.
 * Returns the GalleryApp instance (has .destroy() and .scroll.target for animation).
 */
export async function createCircularGallery(container, options = {}) {
  const OGL = await loadOGL();
  return new GalleryApp(container, options, OGL);
}
