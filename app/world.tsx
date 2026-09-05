'use client';
import { useEffect, useRef } from 'react';
import { films } from './films';

type WorldProps = { selected: number; calm: boolean; playing: boolean; reset: number; onSelect: (index: number) => void; onPlay: () => void; onReady: (ready: boolean) => void; onInteract: () => void };

export default function World(props: WorldProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  useEffect(() => { current.current = props; });
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dispose = () => {};
    let cancelled = false;
    import('./three-runtime').then((T) => {
      if (cancelled) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
      catch { current.current.onReady(false); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, innerWidth < 760 ? 1.5 : 1.8));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = T.SRGBColorSpace;
      const canvas = renderer.domElement;
      canvas.setAttribute('aria-hidden', 'true');
      host.appendChild(canvas);
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(37, 1, .1, 60);
      camera.position.set(0, .35, 10.0);
      const world = new T.Group();
      scene.add(world);
      const geometries: InstanceType<typeof T.BufferGeometry>[] = [];
      const materials: InstanceType<typeof T.Material>[] = [];
      const textures: InstanceType<typeof T.Texture>[] = [];
      const keepGeometry = <G extends InstanceType<typeof T.BufferGeometry>>(g: G) => { geometries.push(g); return g; };
      const keepMaterial = <M extends InstanceType<typeof T.Material>>(m: M) => { materials.push(m); return m; };
      const loader = new T.TextureLoader();
      const studio = new T.Scene();
      studio.background = new T.Color(0x4c101e);
      for (const [x, y, z, w, h] of [[-4, 3, 5, 2, 7], [4, 1, 2, 1, 8], [0, 6, 0, 8, 2]]) {
        const softbox = new T.Mesh(keepGeometry(new T.PlaneGeometry(w, h)), keepMaterial(new T.MeshBasicMaterial({ color: new T.Color(3, 3, 3), side: T.DoubleSide })));
        softbox.position.set(x, y, z); softbox.lookAt(0, 0, 0); studio.add(softbox);
      }
      const pmrem = new T.PMREMGenerator(renderer);
      const environment = pmrem.fromScene(studio, .02);
      scene.environment = environment.texture;
      pmrem.dispose();
      let loaded = 0, needsRender = true;
      const cards = films.map((film, index) => {
        const group = new T.Group();
        const glass = keepMaterial(new T.MeshPhysicalMaterial({ color: 0xb70021, metalness: .32, roughness: .12, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.3 }));
        const body = new T.Mesh(keepGeometry(new T.BoxGeometry(2.19, 3.87, .09)), glass);
        group.add(body);
        const texture = loader.load(film.poster, () => {
          if (cancelled) { texture.dispose(); return; }
          loaded++; needsRender = true;
          if (loaded === films.length) current.current.onReady(true);
        }, undefined, () => current.current.onReady(false));
        texture.colorSpace = T.SRGBColorSpace;
        texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
        textures.push(texture);
        const face = new T.Mesh(keepGeometry(new T.PlaneGeometry(2.1, 3.78)), keepMaterial(new T.MeshBasicMaterial({ map: texture, toneMapped: false })));
        face.position.z = .051;
        face.userData.film = index;
        group.add(face);
        const edge = new T.LineSegments(keepGeometry(new T.EdgesGeometry(body.geometry)), keepMaterial(new T.LineBasicMaterial({ color: film.accent, transparent: true, opacity: .34 })));
        group.add(edge);
        world.add(group);
        return { group, face, edge };
      });
      // A thin twisted optical ribbon. Its two edges exchange places in one revolution.
      const ribbonPositions: number[] = [];
      const ribbonIndices: number[] = [];
      const segments = 320;
      for (let i = 0; i <= segments; i++) {
        const a = i / segments * Math.PI * 2;
        for (const side of [-1, 1]) {
          const r = 2.05 + side * .19 * Math.cos(a * 1.5);
          ribbonPositions.push(Math.cos(a) * r, Math.sin(a) * r * .78, side * .23 * Math.sin(a * 1.5));
        }
        if (i < segments) { const n = i * 2; ribbonIndices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
      }
      const ribbonGeometry = keepGeometry(new T.BufferGeometry());
      ribbonGeometry.setAttribute('position', new T.Float32BufferAttribute(ribbonPositions, 3));
      ribbonGeometry.setIndex(ribbonIndices); ribbonGeometry.computeVertexNormals();
      const ribbonMaterial = keepMaterial(new T.MeshPhysicalMaterial({ color: 0xc9002b, metalness: .4, roughness: .095, clearcoat: 1, clearcoatRoughness: .035, transparent: true, opacity: .88, side: T.DoubleSide, envMapIntensity: 1.35 }));
      const ribbon = new T.Mesh(ribbonGeometry, ribbonMaterial);
      ribbon.position.set(0, -.15, -.25); ribbon.rotation.set(.25, -.38, -.32);
      scene.add(ribbon);
      const light = new T.DirectionalLight(0xfff5f7, 3.2); light.position.set(-3, 4, 5); scene.add(light);
      const rimLight = new T.PointLight(0xff244d, 14, 20); rimLight.position.set(3, -2, 2); scene.add(rimLight);
      scene.add(new T.AmbientLight(0xffffff, 1));
      const network = new T.Group(); scene.add(network);
      const lineMaterial = keepMaterial(new T.LineBasicMaterial({ color: 0xb70021, transparent: true, opacity: .16 }));
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        const points = [new T.Vector3(Math.sin(a) * 1.8, -1.2, Math.cos(a)), new T.Vector3(Math.sin(a) * 3.2, -2.4, Math.cos(a) * 1.8), new T.Vector3(Math.sin(a) * 5.2, -.4, Math.cos(a) * 2.2)];
        const curve = new T.CatmullRomCurve3(points);
        network.add(new T.Line(keepGeometry(new T.BufferGeometry().setFromPoints(curve.getPoints(48))), lineMaterial));
      }
      const groundPoints = Array.from({ length: 161 }, (_, i) => { const a = i / 160 * Math.PI * 2; return new T.Vector3(Math.cos(a) * 5.35, -2.65, Math.sin(a) * 2.5); });
      scene.add(new T.Line(keepGeometry(new T.BufferGeometry().setFromPoints(groundPoints)), keepMaterial(new T.LineBasicMaterial({ color: 0xb70021, opacity: .15, transparent: true }))));
      let width = 1, height = 1, rotation = current.current.selected * Math.PI * 2 / 5, target = rotation, selected = current.current.selected;
      let frame = 0, lastTime = 0, zoom = 0, reset = current.current.reset, elapsed = 0, velocity = 0;
      let previousCalm = current.current.calm;
      const accent = new T.Color(films[selected].accent);
      let pointerX = 0, pointerY = 0, pointerDownX = 0, pointerDownY = 0, dragOffset = 0, dragging = false, travelled = 0;
      const touches = new Map<number, { x: number; y: number }>();
      let pinchDistance = 0;
      const resize = () => { width = host.clientWidth; height = host.clientHeight; renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); needsRender = true; };
      const observer = new ResizeObserver(resize); observer.observe(host); resize();
      const raycaster = new T.Raycaster();
      const hit = (e: PointerEvent) => { const box = canvas.getBoundingClientRect(); raycaster.setFromCamera(new T.Vector2((e.clientX - box.left) / width * 2 - 1, -(e.clientY - box.top) / height * 2 + 1), camera); return raycaster.intersectObjects(cards.map(c => c.face))[0]?.object.userData.film as number | undefined; };
      const down = (e: PointerEvent) => { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId); if (touches.size === 2) { const p = [...touches.values()]; pinchDistance = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y); } pointerDownX = e.clientX; pointerDownY = e.clientY; dragging = true; travelled = 0; };
      const move = (e: PointerEvent) => {
        const box = canvas.getBoundingClientRect(); pointerX = (e.clientX - box.left) / width - .5; pointerY = (e.clientY - box.top) / height - .5;
        if (!dragging) { canvas.style.cursor = hit(e) === undefined ? 'grab' : 'pointer'; return; }
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 2) { const p = [...touches.values()]; const distance = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y); zoom = Math.max(-1, Math.min(1.3, zoom + (pinchDistance - distance) * .01)); needsRender = true; pinchDistance = distance; travelled = 100; return; }
        travelled = Math.max(travelled, Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY));
        dragOffset = -(e.clientX - pointerDownX) / width * 2.6;
      };
      const up = (e: PointerEvent) => {
        touches.delete(e.pointerId); if (touches.size) return;
        dragging = false; current.current.onInteract();
        if (travelled < 8) { const index = hit(e); if (index !== undefined) { if (index === current.current.selected) current.current.onPlay(); else current.current.onSelect(index); } }
        else if (Math.abs(e.clientX - pointerDownX) > 28 && Math.abs(e.clientX - pointerDownX) > Math.abs(e.clientY - pointerDownY)) current.current.onSelect((current.current.selected + (e.clientX < pointerDownX ? 1 : 4)) % 5);
        dragOffset = 0;
      };
      const cancel = () => { touches.clear(); dragging = false; dragOffset = 0; };
      const contextLost = (e: Event) => { e.preventDefault(); current.current.onReady(false); };
      canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('webglcontextlost', contextLost);
      const draw = (time: number) => {
        if (cancelled) return;
        frame = requestAnimationFrame(draw);
        if (document.hidden || current.current.playing || time - lastTime < 32) return;
        const delta = Math.min((time - lastTime) / 1000, .05); lastTime = time;
        if (current.current.selected !== selected) { let step = current.current.selected - selected; if (step > 2) step -= 5; if (step < -2) step += 5; target += step * Math.PI * 2 / 5; selected = current.current.selected; accent.set(films[selected].accent); needsRender = true; }
        if (reset !== current.current.reset) { zoom = 0; pointerX = 0; pointerY = 0; reset = current.current.reset; needsRender = true; }
        const calm = current.current.calm;
        if (calm !== previousCalm) { previousCalm = calm; needsRender = true; }
        if (calm && !needsRender) return;
        needsRender = false;
        if (calm) { rotation = target; velocity = 0; }
        else {
          elapsed += delta;
          const destination = target + dragOffset + (dragging ? 0 : Math.sin(elapsed * .28) * .022);
          velocity += (destination - rotation) * 48 * delta;
          velocity *= Math.exp(-9.5 * delta);
          rotation += velocity * delta;
        }
        const clock = calm ? 0 : elapsed;
        const breath = calm ? 0 : Math.sin(clock * .82);
        ribbonMaterial.color.lerp(accent, calm ? 1 : 1 - Math.exp(-delta * 2.2));
        ribbon.rotation.x = .25 + (calm ? 0 : Math.sin(clock * .36) * .24);
        ribbon.rotation.y = -.38 + clock * .095;
        ribbon.rotation.z = -.32 + (calm ? 0 : Math.sin(clock * .24) * .12 + pointerX * .12);
        ribbon.scale.setScalar(1 + breath * .045);
        ribbon.position.y = -.15 + breath * .07;
        network.rotation.y = -rotation;
        lineMaterial.opacity = .14 + (calm ? 0 : (breath + 1) * .04);
        camera.position.x = T.MathUtils.lerp(camera.position.x, calm ? 0 : pointerX * .34 + Math.sin(clock * .31) * .055, calm ? 1 : .075);
        camera.position.y = T.MathUtils.lerp(camera.position.y, .35 + (calm ? 0 : pointerY * .18 + Math.sin(clock * .42) * .035), calm ? 1 : .075);
        camera.position.z = 10.0 + zoom + breath * .055;
        camera.lookAt(0, -.05, 0);
        cards.forEach(({ group, face, edge }, index) => {
          const a = index * Math.PI * 2 / 5 - rotation;
          group.position.set(Math.sin(a) * 4.9, .1 + Math.sin(clock * .82 + index * 1.3) * (calm ? 0 : .105), Math.cos(a) * 2.25);
          group.lookAt(camera.position); group.rotateY(-Math.sin(a) * .16);
          if (!calm) group.rotateZ(Math.sin(clock * .5 + index) * .009);
          group.scale.setScalar(1 + (index === selected ? breath * .016 : 0));
          const brightness = index === selected ? 1 : .65 + Math.max(0, Math.cos(a)) * .18;
          face.material.color.setScalar(T.MathUtils.lerp(face.material.color.r, brightness, calm ? 1 : .12));
          edge.material.opacity = index === selected ? .72 + breath * .18 : .2;
        });
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(draw);
      dispose = () => { cancelAnimationFrame(frame); observer.disconnect(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('webglcontextlost', contextLost); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); environment.dispose(); renderer.dispose(); canvas.remove(); };
    }).catch(() => current.current.onReady(false));
    return () => { cancelled = true; dispose(); };
  }, []);
  return <div className="three-world" ref={hostRef} />;
}
