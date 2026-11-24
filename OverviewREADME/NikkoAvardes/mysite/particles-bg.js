// Фоновая анимация частиц на чистом JS с использованием ogl
// Требуется: ogl (через CDN)

(function() {
  // hexToRgb функция
  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    var int = parseInt(hex, 16);
    var r = ((int >> 16) & 255) / 255;
    var g = ((int >> 8) & 255) / 255;
    var b = (int & 255) / 255;
    return [r, g, b];
  }

  // GLSL шейдеры
  var vertex = `
    attribute vec3 position;
    attribute vec4 random;
    attribute vec3 color;
    uniform mat4 modelMatrix;
    uniform mat4 viewMatrix;
    uniform mat4 projectionMatrix;
    uniform float uTime;
    uniform float uSpread;
    uniform float uBaseSize;
    uniform float uSizeRandomness;
    varying vec4 vRandom;
    varying vec3 vColor;
    void main() {
      vRandom = random;
      vColor = color;
      vec3 pos = position * uSpread;
      pos.z *= 10.0;
      vec4 mPos = modelMatrix * vec4(pos, 1.0);
      float t = uTime;
      mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
      mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
      mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);
      vec4 mvPos = viewMatrix * mPos;
      if (uSizeRandomness == 0.0) {
        gl_PointSize = uBaseSize;
      } else {
        gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
      }
      gl_Position = projectionMatrix * mvPos;
    }
  `;
  var fragment = `
    precision highp float;
    uniform float uTime;
    uniform float uAlphaParticles;
    varying vec4 vRandom;
    varying vec3 vColor;
    void main() {
      vec2 uv = gl_PointCoord.xy;
      float d = length(uv - vec2(0.5));
      if(uAlphaParticles < 0.5) {
        if(d > 0.5) {
          discard;
        }
        gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
      } else {
        float circle = smoothstep(0.5, 0.4, d) * 0.8;
        gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
      }
    }
  `;

  // Основная функция
  window.initParticlesBackground = function(options) {
    options = options || {};
    var particleCount = options.particleCount || 200;
    var particleSpread = options.particleSpread || 10;
    var speed = options.speed || 0.1;
    var particleColors = options.particleColors || ['#ffffff', '#ffffff', '#ffffff'];
    var alphaParticles = options.alphaParticles || false;
    var particleBaseSize = options.particleBaseSize || 100;
    var sizeRandomness = options.sizeRandomness || 1;
    var cameraDistance = options.cameraDistance || 20;
    var pixelRatio = options.pixelRatio || window.devicePixelRatio || 1;
    var container = options.container || document.body;
    var className = options.className || '';

    // Проверка ogl
    if (!window.ogl) {
      console.error('ogl не найден. Подключите ogl через CDN!');
      return;
    }
    var Renderer = ogl.Renderer, Camera = ogl.Camera, Geometry = ogl.Geometry, Program = ogl.Program, Mesh = ogl.Mesh;

    // Контейнер
    var bgDiv = document.createElement('div');
    bgDiv.className = 'particles-container ' + className;
    bgDiv.style.position = 'fixed';
    bgDiv.style.left = 0;
    bgDiv.style.top = 0;
    bgDiv.style.width = '100vw';
    bgDiv.style.height = '100vh';
    bgDiv.style.zIndex = '-1';
    bgDiv.style.pointerEvents = 'none';
    container.prepend(bgDiv);

    var renderer = new Renderer({ dpr: pixelRatio, depth: false, alpha: true });
    var gl = renderer.gl;
    bgDiv.appendChild(gl.canvas);
    gl.clearColor(0, 0, 0, 0);

    var camera = new Camera(gl, { fov: 15 });
    camera.position.set(0, 0, cameraDistance);

    function resize() {
      var width = bgDiv.clientWidth;
      var height = bgDiv.clientHeight;
      renderer.setSize(width, height);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    }
    window.addEventListener('resize', resize, false);
    resize();

    var count = particleCount;
    var positions = new Float32Array(count * 3);
    var randoms = new Float32Array(count * 4);
    var colors = new Float32Array(count * 3);
    var palette = particleColors.length > 0 ? particleColors : ['#fff'];
    for (var i = 0; i < count; i++) {
      var x, y, z, len;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      var r = Math.cbrt(Math.random());
      positions.set([x * r, y * r, z * r], i * 3);
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      var col = hexToRgb(palette[Math.floor(Math.random() * palette.length)]);
      colors.set(col, i * 3);
    }
    var geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors }
    });
    var program = new Program(gl, {
      vertex: vertex,
      fragment: fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: particleSpread },
        uBaseSize: { value: particleBaseSize * pixelRatio },
        uSizeRandomness: { value: sizeRandomness },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 }
      },
      transparent: true,
      depthTest: false
    });
    var particles = new Mesh(gl, { mode: gl.POINTS, geometry: geometry, program: program });
    var animationFrameId;
    var lastTime = performance.now();
    var elapsed = 0;
    function update(t) {
      animationFrameId = requestAnimationFrame(update);
      var delta = t - lastTime;
      lastTime = t;
      elapsed += delta * speed;
      program.uniforms.uTime.value = elapsed * 0.001;
      particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
      particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
      particles.rotation.z += 0.01 * speed;
      renderer.render({ scene: particles, camera: camera });
    }
    animationFrameId = requestAnimationFrame(update);
    // Очистка
    bgDiv._destroyParticles = function() {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
      if (bgDiv.contains(gl.canvas)) bgDiv.removeChild(gl.canvas);
      if (bgDiv.parentNode) bgDiv.parentNode.removeChild(bgDiv);
    };
    return bgDiv;
  };
})();
