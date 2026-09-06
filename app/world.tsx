'use client';
import { useEffect, useRef } from 'react';
import { films } from './films';
import { createSpatialEnvironment } from './spatial-environment';

type WorldProps = { selected: number; calm: boolean; playing: boolean; reset: number; onSelect: (index: number) => void; onPlay: () => void; onReady: (ready: boolean) => void; onInteract: () => void };

export default function World(props: WorldProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  useEffect(() => { current.current = props; });
  useEffect(() => {
    const host = hostRef.current;
    const gallery = host?.parentElement?.querySelector<HTMLElement>('.world-frame');
    if (!host || !gallery) return;
    let dispose = () => {};
    let cancelled = false;
    import('./three-runtime').then((T) => {
      if (cancelled) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
      catch { current.current.onReady(false); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, innerWidth < 760 ? 1.25 : 1.5));
      renderer.autoClear = false;
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
      studio.background = new T.Color(0x050b17);
      for (const [x, y, z, w, h] of [[-4, 3, 5, 2, 7], [4, 1, 2, 1, 8], [0, 6, 0, 8, 2]]) {
        const softbox = new T.Mesh(keepGeometry(new T.PlaneGeometry(w, h)), keepMaterial(new T.MeshBasicMaterial({ color: new T.Color(3, 3, 3), side: T.DoubleSide })));
        softbox.position.set(x, y, z); softbox.lookAt(0, 0, 0); studio.add(softbox);
      }
      const pmrem = new T.PMREMGenerator(renderer);
      const environment = pmrem.fromScene(studio, .02);
      scene.environment = environment.texture;
      pmrem.dispose();
      const space = createSpatialEnvironment(T, environment.texture);
      let loaded = 0, needsRender = true, contextAvailable = true;
      const faceGeometry = keepGeometry(new T.PlaneGeometry(2.1, 3.78));
      const frameGeometry = keepGeometry(new T.BoxGeometry(2.122, 3.802, .028));
      const edgeGeometry = keepGeometry(new T.EdgesGeometry(frameGeometry));
      const cards = films.map((film, index) => {
        const group = new T.Group();
        const glass = keepMaterial(new T.MeshPhysicalMaterial({ color: 0x071120, metalness: .65, roughness: .18, clearcoat: 1, clearcoatRoughness: .09, envMapIntensity: .7 }));
        const body = new T.Mesh(frameGeometry, glass);
        group.add(body);
        const texture = loader.load(film.poster, () => {
          if (cancelled) { texture.dispose(); return; }
          loaded++; needsRender = true;
          if (loaded === films.length && contextAvailable) { host.dataset.ready = 'true'; current.current.onReady(true); }
        }, undefined, () => current.current.onReady(false));
        texture.colorSpace = T.SRGBColorSpace;
        texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
        textures.push(texture);
        const face = new T.Mesh(faceGeometry, keepMaterial(new T.MeshBasicMaterial({ map: texture, toneMapped: false })));
        face.position.z = .016;
        face.userData.film = index;
        group.add(face);
        const edge = new T.LineSegments(edgeGeometry, keepMaterial(new T.LineBasicMaterial({ color: 0x7793b0, transparent: true, opacity: .3 })));
        group.add(edge);
        world.add(group);
        return { group, face, edge };
      });
      const light = new T.DirectionalLight(0xa6bfdf, 1.2); light.position.set(-3, 4, 5); scene.add(light);
      const rimLight = new T.PointLight(0x294b7c, 5, 20); rimLight.position.set(3, -2, 2); scene.add(rimLight);
      scene.add(new T.AmbientLight(0x7e9fcb, .4));
      let width = 1, height = 1, rotation = current.current.selected * Math.PI * 2 / 5, target = rotation, selected = current.current.selected;
      let frame = 0, lastTime = 0, zoom = 0, reset = current.current.reset, elapsed = 0, velocity = 0;
      let previousCalm = current.current.calm;

      let pointerX = 0, pointerY = 0, pointerDownX = 0, pointerDownY = 0, dragOffset = 0, dragging = false, travelled = 0;
      const touches = new Map<number, { x: number; y: number }>();
      let pinchDistance = 0;
      let fullWidth = 1, fullHeight = 1, viewportLeft = 0, viewportBottom = 0;
      const resize = () => {
        const bounds = host.getBoundingClientRect(), area = gallery.getBoundingClientRect();
        width = area.width; height = area.height; fullWidth = bounds.width; fullHeight = bounds.height;
        viewportLeft = area.left - bounds.left; viewportBottom = bounds.bottom - area.bottom;
        renderer.setSize(fullWidth, fullHeight); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix();
        space.resize(fullWidth, fullHeight); needsRender = true;
      };
      const observer = new ResizeObserver(resize); observer.observe(host); observer.observe(gallery); resize();
      const raycaster = new T.Raycaster();
      const hit = (e: PointerEvent) => { const box = gallery.getBoundingClientRect(); raycaster.setFromCamera(new T.Vector2((e.clientX - box.left) / width * 2 - 1, -(e.clientY - box.top) / height * 2 + 1), camera); return raycaster.intersectObjects(cards.map(c => c.face))[0]?.object.userData.film as number | undefined; };
      const down = (e: PointerEvent) => { if (host.dataset.ready !== 'true') return; touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); gallery.setPointerCapture(e.pointerId); if (touches.size === 2) { const p = [...touches.values()]; pinchDistance = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y); } pointerDownX = e.clientX; pointerDownY = e.clientY; dragging = true; travelled = 0; };
      const move = (e: PointerEvent) => {
        if (host.dataset.ready !== 'true') return;
        const box = gallery.getBoundingClientRect(); pointerX = (e.clientX - box.left) / width - .5; pointerY = (e.clientY - box.top) / height - .5;
        if (!dragging) { gallery.style.cursor = hit(e) === undefined ? 'grab' : 'pointer'; return; }
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 2) { const p = [...touches.values()]; const distance = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y); zoom = Math.max(-1, Math.min(1.3, zoom + (pinchDistance - distance) * .01)); needsRender = true; pinchDistance = distance; travelled = 100; return; }
        travelled = Math.max(travelled, Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY));
        dragOffset = -(e.clientX - pointerDownX) / width * 2.6;
      };
      const up = (e: PointerEvent) => {
        if (!dragging) return;
        touches.delete(e.pointerId); if (touches.size) return;
        dragging = false; current.current.onInteract();
        if (travelled < 8) { const index = hit(e); if (index !== undefined) { if (index === current.current.selected) current.current.onPlay(); else current.current.onSelect(index); } }
        else if (Math.abs(e.clientX - pointerDownX) > 28 && Math.abs(e.clientX - pointerDownX) > Math.abs(e.clientY - pointerDownY)) current.current.onSelect((current.current.selected + (e.clientX < pointerDownX ? 1 : 4)) % 5);
        dragOffset = 0;
      };
      const cancel = () => { touches.clear(); dragging = false; dragOffset = 0; };
      const contextLost = (e: Event) => { e.preventDefault(); contextAvailable = false; cancel(); cancelAnimationFrame(frame); host.dataset.ready = 'false'; current.current.onReady(false); };
      const ambientMove = (e: PointerEvent) => { if (current.current.calm || current.current.playing || dragging || e.pointerType === 'touch') return; const bounds = host.getBoundingClientRect(); pointerX = (e.clientX - bounds.left) / bounds.width - .5; pointerY = (e.clientY - bounds.top) / bounds.height - .5; };
      const leave = () => { if (!dragging) { pointerX = 0; pointerY = 0; } };
      gallery.addEventListener('pointerdown', down); gallery.addEventListener('pointermove', move); gallery.addEventListener('pointerup', up); gallery.addEventListener('pointercancel', cancel); canvas.addEventListener('webglcontextlost', contextLost);
      host.parentElement?.addEventListener('pointermove', ambientMove, { passive: true }); host.parentElement?.addEventListener('pointerleave', leave);
      const draw = (time: number) => {
        if (cancelled) return;
        frame = requestAnimationFrame(draw);
        if (document.hidden || current.current.playing || time - lastTime < (fullWidth < 761 ? 40 : 32)) return;
        const delta = Math.min((time - lastTime) / 1000, .05); lastTime = time;
        if (current.current.selected !== selected) { let step = current.current.selected - selected; if (step > 2) step -= 5; if (step < -2) step += 5; target += step * Math.PI * 2 / 5; selected = current.current.selected; needsRender = true; }
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
          const brightness = index === selected ? 1 : .5 + Math.max(0, Math.cos(a)) * .18;
          face.material.color.setScalar(T.MathUtils.lerp(face.material.color.r, brightness, calm ? 1 : .12));
          edge.material.opacity = index === selected ? .48 + breath * .08 : .19;
        });
        space.update(clock, pointerX, pointerY, rotation, velocity, calm);
        renderer.setScissorTest(false); renderer.setViewport(0, 0, fullWidth, fullHeight);
        renderer.clear(); renderer.render(space.scene, space.camera);
        renderer.clearDepth(); renderer.setViewport(viewportLeft, viewportBottom, width, height);
        renderer.setScissor(viewportLeft, viewportBottom, width, height); renderer.setScissorTest(true);
        renderer.render(scene, camera); renderer.setScissorTest(false);
      };
      frame = requestAnimationFrame(draw);
      dispose = () => { cancelAnimationFrame(frame); observer.disconnect(); gallery.removeEventListener('pointerdown', down); gallery.removeEventListener('pointermove', move); gallery.removeEventListener('pointerup', up); gallery.removeEventListener('pointercancel', cancel); canvas.removeEventListener('webglcontextlost', contextLost); host.parentElement?.removeEventListener('pointermove', ambientMove); host.parentElement?.removeEventListener('pointerleave', leave); space.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); environment.dispose(); renderer.dispose(); canvas.remove(); };
    }).catch(() => current.current.onReady(false));
    return () => { cancelled = true; dispose(); };
  }, []);
  return <div className="three-world" ref={hostRef} />;
}
