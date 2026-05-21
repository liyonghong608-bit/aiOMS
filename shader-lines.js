/* ============================================================
   Shader Lines — vanilla port of the React/Three.js component.
   Loads Three.js r89 from CDN on first use, then runs the
   animated line shader inside any element with id="shader-banner".
   Safe to call mountShaderBanner() multiple times; bails if WebGL
   isn't available so the page still loads.
   ============================================================ */
(function () {
  const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js';
  let threePromise = null;

  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (threePromise) return threePromise;
    threePromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = THREE_CDN;
      s.onload = () => resolve(window.THREE);
      s.onerror = () => reject(new Error('Failed to load Three.js'));
      document.head.appendChild(s);
    });
    return threePromise;
  }

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  async function mountShaderBanner(id) {
    id = id || 'shader-banner';
    const container = document.getElementById(id);
    if (!container) return;
    if (!hasWebGL()) { container.classList.add('shader-banner--fallback'); return; }

    let THREE;
    try { THREE = await loadThree(); }
    catch (e) { container.classList.add('shader-banner--fallback'); return; }

    // Reset container, keep any overlay child intact
    const label = container.querySelector('.shader-banner-label');
    container.querySelectorAll('canvas').forEach(c => c.remove());

    const camera = new THREE.Camera();
    camera.position.z = 1;

    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneBufferGeometry(2, 2);

    const uniforms = {
      time: { type: 'f', value: 1.0 },
      resolution: { type: 'v2', value: new THREE.Vector2() }
    };

    const vertexShader = `
      void main() { gl_Position = vec4(position, 1.0); }
    `;

    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359
      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      float random(in float x) { return fract(sin(x) * 1e4); }
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        vec2 fMosaicScal = vec2(4.0, 2.0);
        vec2 vScreenSize = vec2(256.0, 256.0);
        uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
        uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);

        float t = time * 0.06 + random(uv.x) * 0.4;
        float lineWidth = 0.0008;

        vec3 color = vec3(0.0);
        for (int j = 0; j < 3; j++) {
          for (int i = 0; i < 5; i++) {
            color[j] += lineWidth * float(i * i) /
              abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 1.0 - length(uv));
          }
        }
        gl_FragColor = vec4(color[2], color[1], color[0], 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    function resize() {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h, false);
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
    }
    resize();
    window.addEventListener('resize', resize, false);

    let raf = null;
    function animate() {
      raf = requestAnimationFrame(animate);
      uniforms.time.value += 0.05;
      renderer.render(scene, camera);
    }
    animate();

    container._shaderTeardown = () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize, false);
      try { renderer.dispose(); } catch (e) {}
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }

  // Auto-mount on DOMContentLoaded if a banner exists
  function autoMount() {
    if (document.getElementById('shader-banner')) mountShaderBanner('shader-banner');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }

  window.mountShaderBanner = mountShaderBanner;
})();
