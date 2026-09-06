import type * as Three from './three-runtime';

// Shares the gallery's renderer and environment map. No extra WebGL context,
// downloaded scene, shadow maps, or full-screen postprocessing.
export function createSpatialEnvironment(T: typeof Three, environment: Three.Texture) {
  const scene = new T.Scene();
  scene.background = new T.Color(0x02050b);
  scene.fog = new T.FogExp2(0x02050b, .038);
  scene.environment = environment;
  const camera = new T.PerspectiveCamera(48, 1, .1, 120);
  camera.position.set(0, 1.2, 12.5);
  const architecture = new T.Group();
  scene.add(architecture);
  const geometries: Three.BufferGeometry[] = [];
  const materials: Three.Material[] = [];
  const geometry = <G extends Three.BufferGeometry>(value: G) => { geometries.push(value); return value; };
  const material = <M extends Three.Material>(value: M) => { materials.push(value); return value; };
  const shell = material(new T.MeshPhysicalMaterial({ color: 0x0b1629, metalness: .8, roughness: .34, clearcoat: .65, clearcoatRoughness: .2, envMapIntensity: .35, side: T.DoubleSide }));
  const edges = material(new T.LineBasicMaterial({ color: 0x537fad, transparent: true, opacity: .23 }));
  // Asymmetric, open vaults: broad surfaces reveal perspective as the camera moves.
  for (let rib = 0; rib < 8; rib++) {
    const positions: number[] = [], indices: number[] = [];
    const outline: Three.Vector3[] = [];
    for (let step = 0; step <= 80; step++) {
      const angle = step / 80 * Math.PI;
      const x = Math.cos(angle) * 10.8;
      const y = -3.2 + Math.sin(angle) * (9 + Math.cos(angle) * .7);
      const z = 1.4 - rib * 5.5 + Math.sin(angle * 2) * 1.7;
      positions.push(x, y, z, x * 1.014, y + .11, z - 1.2);
      outline.push(new T.Vector3(x, y, z + .015));
      if (step < 80) { const a = step * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const surface = geometry(new T.BufferGeometry());
    surface.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    surface.setIndex(indices); surface.computeVertexNormals();
    architecture.add(new T.Mesh(surface, shell));
    architecture.add(new T.Line(geometry(new T.BufferGeometry().setFromPoints(outline)), edges));
  }
  scene.add(new T.AmbientLight(0x6185ad, .55));
  const light = new T.PointLight(0x779ed6, 28, 45, 2);
  light.position.set(-6, 3, 6); scene.add(light);
  const rim = new T.PointLight(0x28558f, 45, 50, 2);
  rim.position.set(8, 1, -8); scene.add(rim);

  const uniforms = { uTime: { value: 0 }, uMotion: { value: 0 } };
  const floor = new T.Mesh(geometry(new T.PlaneGeometry(160, 160)), material(new T.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec3 vWorld;
      void main() { vec4 world = modelMatrix * vec4(position,1.); vWorld = world.xyz; gl_Position = projectionMatrix * viewMatrix * world; }`,
    fragmentShader: `varying vec3 vWorld; uniform float uTime; uniform float uMotion;
      void main() {
        vec2 p = vWorld.xz;
        float depth = exp(-abs(p.y + 6.) * .035);
        float distanceFade = exp(-length(p) * .055);
        float ripple = sin(p.x * .52 + sin(p.y * .3 + uTime * .14) * .65);
        float seam = pow(max(0., 1. - abs(ripple)), 22.);
        float pool = exp(-dot(p - vec2(0.,-3.), p - vec2(0.,-3.)) * .009);
        float band = exp(-pow((length((p + vec2(0.,5.)) * vec2(.78,1.)) - 10.5) * .8, 2.));
        vec3 color = vec3(.006,.012,.024) + vec3(.012,.031,.059) * pool;
        color += vec3(.014,.038,.073) * (seam * .34 + band * .35) * depth * (1. + uMotion * .22);
        gl_FragColor = vec4(mix(vec3(.000607,.001518,.003347), color * .18, distanceFade),1.);
        #include <colorspace_fragment>
      }`,
    depthWrite: true,
  })));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -3.24, -30); scene.add(floor);

  const random = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
  const dustPositions: number[] = [], dustSizes: number[] = [];
  for (let i = 0; i < 280; i++) {
    dustPositions.push((random(i + 1) - .5) * 33, random(i + 301) * 13 - 3, -random(i + 601) * 65);
    dustSizes.push(.55 + random(i + 901) * 1.1);
  }
  const dustGeometry = geometry(new T.BufferGeometry());
  dustGeometry.setAttribute('position', new T.Float32BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute('aSize', new T.Float32BufferAttribute(dustSizes, 1));
  const dustMaterial = material(new T.ShaderMaterial({
    uniforms,
    transparent: true, depthWrite: false,
    vertexShader: `attribute float aSize; uniform float uTime; varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * .11 + position.z) * .18;
        p.y += sin(uTime * .17 + position.x) * .22;
        vec4 view = modelViewMatrix * vec4(p,1.);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(aSize * 32. / max(5., -view.z), .8, 3.);
        vAlpha = clamp(1. - (-view.z / 80.),0.,1.) * .42;
      }`,
    fragmentShader: `varying float vAlpha; void main() {
      float d = length(gl_PointCoord - .5) * 2.;
      gl_FragColor = vec4(.42,.6,.83,(1. - smoothstep(.12,1.,d)) * vAlpha);
    }`,
  }));
  scene.add(new T.Points(dustGeometry, dustMaterial));

  return {
    scene, camera,
    resize(width: number, height: number) {
      const mobile = width < 761;
      camera.aspect = width / Math.max(height, 1); camera.fov = mobile ? 60 : 48;
      camera.updateProjectionMatrix();
      architecture.scale.x = mobile ? .48 : 1;
      dustGeometry.setDrawRange(0, mobile ? 150 : 280);
    },
    update(time: number, pointerX: number, pointerY: number, rotation: number, velocity: number, calm: boolean) {
      uniforms.uTime.value = calm ? 0 : time;
      uniforms.uMotion.value = Math.min(Math.abs(velocity), 1);
      const follow = calm ? 1 : .055;
      camera.position.x = T.MathUtils.lerp(camera.position.x, calm ? 0 : pointerX * 1.5 + Math.sin(rotation) * .45, follow);
      camera.position.y = T.MathUtils.lerp(camera.position.y, 1.2 + (calm ? 0 : pointerY * .6), follow);
      camera.position.z = T.MathUtils.lerp(camera.position.z, 12.5 - (calm ? 0 : Math.min(Math.abs(velocity) * .45, .6) + Math.sin(time * .18) * .15), follow);
      camera.lookAt(0, .35, -12);
      architecture.rotation.z = calm ? 0 : Math.sin(time * .12) * .004;
      light.position.x = -6 + (calm ? 0 : pointerX * 5 + Math.sin(rotation) * 2);
      rim.intensity = 40 + (calm ? 0 : Math.min(Math.abs(velocity) * 16, 22));
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
