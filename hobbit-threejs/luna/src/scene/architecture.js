import * as THREE from 'three';

function addBox(group, size, position, material, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  group.add(mesh);
  return mesh;
}

function addRoundWindow(group, x, y, z, scale, materials, warmWindows) {
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.42 * scale, 0.075 * scale, 8, 22), materials.timber);
  frame.position.set(x, y, z);
  frame.castShadow = true;
  group.add(frame);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.36 * scale, 20), materials.window);
  glass.position.set(x, y, z + 0.012);
  group.add(glass);
  const barA = addBox(group, [0.05 * scale, 0.72 * scale, 0.04], [x, y, z + 0.03], materials.timber, { castShadow: false });
  const barB = addBox(group, [0.72 * scale, 0.05 * scale, 0.04], [x, y, z + 0.035], materials.timber, { castShadow: false });
  warmWindows.push(glass);
  return { frame, glass, barA, barB };
}

function addLamp(group, x, z, heightFn, materials, scale = 1) {
  const lamp = new THREE.Group();
  lamp.position.set(x, heightFn(x, z), z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.07 * scale, 1.7 * scale, 7), materials.timber);
  pole.position.y = 0.85 * scale;
  lamp.add(pole);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 10, 8), materials.window);
  glow.position.y = 1.72 * scale;
  lamp.add(glow);
  const halo = new THREE.PointLight(0xe9a65d, 0.65, 4.4, 2);
  halo.position.y = 1.72 * scale;
  halo.castShadow = false;
  lamp.add(halo);
  group.add(lamp);
  return lamp;
}

function createCottage({ x, z, width, depth, height, roof, angle, variant, terrain, materials, windows }) {
  const cottage = new THREE.Group();
  cottage.name = `cottage-${variant}`;
  cottage.position.set(x, terrain(x, z), z);
  cottage.rotation.y = angle;
  const baseMaterial = variant % 2 ? materials.plasterLight : materials.plaster;
  const body = addBox(cottage, [width, height, depth], [0, height * 0.5, 0], baseMaterial);
  body.castShadow = true;
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.71, roof, 4), variant % 3 === 0 ? materials.roof : materials.timber);
  roofMesh.position.y = height + roof * 0.42;
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.castShadow = true;
  cottage.add(roofMesh);
  addBox(cottage, [0.8, 1.45, 0.09], [0, 0.72, depth * 0.5 + 0.06], materials.timber, { castShadow: true });
  const windowPositions = [-width * 0.27, width * 0.27];
  windowPositions.forEach((windowX, index) => addRoundWindow(cottage, windowX, 1.18 + (index % 2) * 0.14, depth * 0.5 + 0.065, 0.7, materials, windows));
  if (variant % 3 === 1) {
    addBox(cottage, [width * 0.8, 0.16, 0.68], [0, height + 0.07, depth * 0.2], materials.timber);
  }
  cottage.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return cottage;
}

function createBagEnd({ terrain, materials, windows, props }) {
  const x = 8;
  const z = -10;
  const home = new THREE.Group();
  home.name = 'bag-end';
  home.position.set(x, terrain(x, z), z);

  const hillShell = new THREE.Mesh(new THREE.SphereGeometry(6.1, 32, 18), materials.grassDark);
  hillShell.scale.set(1.18, 0.4, 0.55);
  hillShell.position.set(0, 1.92, -2.8);
  hillShell.castShadow = true;
  hillShell.receiveShadow = true;
  home.add(hillShell);

  const facade = new THREE.Mesh(new THREE.BoxGeometry(4.9, 2.22, 1.22), materials.plasterLight);
  facade.position.set(0, 1.14, 1.42);
  facade.castShadow = true;
  facade.receiveShadow = true;
  home.add(facade);
  const facadeDome = new THREE.Mesh(new THREE.SphereGeometry(2.46, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), materials.plasterLight);
  facadeDome.scale.set(1, 0.54, 0.5);
  facadeDome.position.set(0, 2.25, 1.42);
  facadeDome.castShadow = true;
  home.add(facadeDome);

  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.7, 20, 1, true, 0, Math.PI), materials.timber);
  door.position.set(0, 0.84, 2.12);
  door.rotation.y = Math.PI;
  door.scale.z = 0.25;
  door.castShadow = true;
  home.add(door);
  const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), materials.gold);
  doorKnob.position.set(-0.2, 0.82, 2.34);
  home.add(doorKnob);

  addRoundWindow(home, -1.44, 1.65, 2.08, 0.88, materials, windows);
  addRoundWindow(home, 1.46, 1.45, 2.08, 0.72, materials, windows);
  addRoundWindow(home, 0.15, 2.1, 2.08, 0.46, materials, windows);

  const terrace = new THREE.Group();
  terrace.position.set(0, 0.28, 3.15);
  addBox(terrace, [5.2, 0.22, 2.1], [0, 0, 0], materials.stoneLight);
  for (const side of [-1, 1]) {
    addBox(terrace, [0.14, 0.72, 2.1], [side * 2.42, 0.45, 0], materials.timber);
    for (let i = -2; i <= 2; i += 1) addBox(terrace, [0.08, 0.68, 0.08], [side * 2.42, 0.43, i * 0.42], materials.timber);
  }
  addBox(terrace, [5.1, 0.1, 0.14], [0, 0.83, 1.0], materials.timber);
  home.add(terrace);

  const conservatory = new THREE.Group();
  conservatory.position.set(2.85, 0.42, 0.25);
  addBox(conservatory, [1.7, 1.8, 2.25], [0, 0.92, 0], materials.timber);
  addBox(conservatory, [1.44, 1.45, 0.08], [0, 0.94, 1.16], materials.glass, { castShadow: false });
  addBox(conservatory, [1.44, 0.07, 2.05], [0, 1.84, 0], materials.glass, { castShadow: false });
  for (const side of [-1, 1]) addBox(conservatory, [0.08, 1.4, 1.95], [side * 0.76, 0.93, 0], materials.glass, { castShadow: false });
  home.add(conservatory);

  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.48, 0.72, 10), materials.copper);
  vent.position.set(-1.45, 3.15, -0.7);
  vent.castShadow = true;
  home.add(vent);
  const ventTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.32, 0.12, 10), materials.copper);
  ventTop.position.set(-1.45, 3.56, -0.7);
  home.add(ventTop);

  const flag = new THREE.Group();
  flag.position.set(2.1, 2.75, 2.05);
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.25, 6), materials.timber);
  flagPole.position.y = 0.58;
  flag.add(flagPole);
  const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.36), new THREE.MeshStandardMaterial({ color: 0xb25e45, side: THREE.DoubleSide, roughness: 0.8 }));
  pennant.position.set(0.28, 1.02, 0);
  pennant.rotation.y = Math.PI / 2;
  flag.add(pennant);
  home.add(flag);

  const table = new THREE.Group();
  table.position.set(-2.4, 0.42, 3.52);
  addBox(table, [1.8, 0.12, 0.72], [0, 0.62, 0], materials.timber);
  addBox(table, [0.12, 0.62, 0.12], [-0.74, 0.3, -0.23], materials.timber);
  addBox(table, [0.12, 0.62, 0.12], [0.74, 0.3, -0.23], materials.timber);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.14, 10), materials.gold);
  cup.position.set(-0.35, 1.03, 0);
  table.add(cup);
  home.add(table);
  props.push(table);

  home.traverse((child) => {
    if (child.isMesh && child !== hillShell) {
      child.castShadow = child.castShadow ?? true;
      child.receiveShadow = true;
    }
  });

  return {
    group: home,
    position: new THREE.Vector3(x, terrain(x, z), z),
    announcementPoint: new THREE.Vector3(x, terrain(x, z) + 1.0, z + 4.25),
    terracePoint: new THREE.Vector3(x, terrain(x, z) + 0.45, z + 3.15),
    windowMeshes: windows,
  };
}

export function createVillage({ terrain, materials }) {
  const group = new THREE.Group();
  group.name = 'hobbiton-village';
  const windows = [];
  const props = [];
  const heightFn = terrain.getHeightAt;
  const bagEnd = createBagEnd({ terrain: heightFn, materials, windows, props });
  group.add(bagEnd.group);

  const cottageData = [
    [-21, 9, 3.1, 2.8, 2.2, 2.7, 0.22], [-12, -1, 3.6, 2.9, 2.45, 3.0, -0.35], [-5, 14, 4.1, 3.1, 2.7, 3.3, 0.1],
    [8, 15, 3.5, 3, 2.4, 2.8, 0.55], [22, 9, 4.2, 3.2, 2.6, 3.4, -0.15], [28, -1, 3.2, 2.8, 2.15, 2.6, 0.2],
    [-25, -10, 4, 3.1, 2.55, 3, 0.4], [19, -14, 4.5, 3.2, 2.7, 3.5, -0.35],
  ];
  cottageData.forEach(([x, z, width, depth, height, roof, angle], index) => {
    const cottage = createCottage({ x, z, width, depth, height, roof, angle, variant: index, terrain: heightFn, materials, windows });
    group.add(cottage);
  });

  const square = new THREE.Group();
  square.name = 'village-square';
  square.position.set(-7.5, heightFn(-7.5, 4) + 0.06, 4);
  const squareSurface = new THREE.Mesh(new THREE.CircleGeometry(4.2, 32), materials.path);
  squareSurface.rotation.x = -Math.PI / 2;
  squareSurface.scale.set(1.15, 0.72, 1);
  squareSurface.receiveShadow = true;
  square.add(squareSurface);
  const treeTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 3.1, 8), materials.timber);
  treeTrunk.position.set(-1.6, 1.55, -0.8);
  treeTrunk.castShadow = true;
  square.add(treeTrunk);
  const squareTree = new THREE.Mesh(new THREE.DodecahedronGeometry(1.65, 1), materials.leafLight);
  squareTree.position.set(-1.6, 3.55, -0.8);
  squareTree.scale.y = 0.85;
  squareTree.castShadow = true;
  square.add(squareTree);
  const bench = addBox(square, [2.8, 0.14, 0.55], [0.8, 0.62, 1.5], materials.timber);
  addBox(square, [0.13, 0.6, 0.13], [-0.28, 0.3, 1.5], materials.timber);
  addBox(square, [0.13, 0.6, 0.13], [1.88, 0.3, 1.5], materials.timber);
  props.push(bench);
  const noticeBoard = new THREE.Group();
  noticeBoard.position.set(1.65, 0.75, -1.42);
  addBox(noticeBoard, [1.25, 1.1, 0.12], [0, 1.15, 0], materials.timber);
  addBox(noticeBoard, [1.02, 0.78, 0.04], [0, 1.17, 0.1], materials.plasterLight, { castShadow: false });
  addBox(noticeBoard, [0.15, 1.25, 0.15], [-0.47, 0.34, 0], materials.timber);
  addBox(noticeBoard, [0.15, 1.25, 0.15], [0.47, 0.34, 0], materials.timber);
  square.add(noticeBoard);
  props.push(noticeBoard);
  group.add(square);

  const workshop = new THREE.Group();
  workshop.position.set(-18, heightFn(-18, 6), 6);
  addBox(workshop, [4.6, 2.4, 3.4], [0, 1.2, 0], materials.timber);
  const workshopRoof = new THREE.Mesh(new THREE.ConeGeometry(3.7, 2.0, 4), materials.roof);
  workshopRoof.position.y = 3.0;
  workshopRoof.rotation.y = Math.PI / 4;
  workshop.add(workshopRoof);
  addBox(workshop, [1.8, 1.65, 0.1], [0, 0.85, 1.75], materials.timber);
  addRoundWindow(workshop, -1.35, 1.42, 1.75, 0.58, materials, windows);
  addRoundWindow(workshop, 1.35, 1.42, 1.75, 0.58, materials, windows);
  const cart = new THREE.Group();
  cart.position.set(2.8, 0.4, 1.9);
  addBox(cart, [1.5, 0.35, 0.85], [0, 0.55, 0], materials.timber);
  for (const wheelX of [-0.55, 0.55]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 16), materials.stone);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wheelX, 0.26, 0.5);
    cart.add(wheel);
  }
  workshop.add(cart);
  props.push(cart);
  group.add(workshop);

  const lampGroup = new THREE.Group();
  [[-7, 1, 1], [-4, 5, 0.85], [0, 0, 0.95], [8, -6, 0.95], [16, 3, 0.9], [19, -12, 0.95]].forEach(([x, z, scale]) => addLamp(lampGroup, x, z, heightFn, materials, scale));
  group.add(lampGroup);

  const distantRidge = new THREE.Group();
  const ridgeMaterial = new THREE.MeshStandardMaterial({ color: 0x2d4740, roughness: 1, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 9; i += 1) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(8 + (i % 3) * 3, 24, 12), ridgeMaterial);
    hill.scale.y = 0.5 + (i % 2) * 0.15;
    hill.position.set(-42 + i * 10, -0.2 + (i % 3) * 0.2, -32 - (i % 2) * 3);
    hill.castShadow = false;
    distantRidge.add(hill);
  }
  group.add(distantRidge);

  const anchors = {
    bagEnd: bagEnd.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
    announcement: bagEnd.announcementPoint.clone(),
    terrace: bagEnd.terracePoint.clone(),
    square: new THREE.Vector3(-7.5, heightFn(-7.5, 4) + 1.1, 4),
  };

  return {
    group,
    bagEnd,
    windows,
    props,
    anchors,
    update(state) {
      const evening = state.timeContrast ?? 0;
      windows.forEach((window) => {
        if (window.material?.emissiveIntensity !== undefined) window.material.emissiveIntensity = 1.35 + evening * 1.3;
      });
      const lights = lampGroup.children;
      lights.forEach((lamp, index) => {
        const point = lamp.children.find((child) => child.isPointLight);
        if (point) point.intensity = Math.max(0.08, evening * 1.3 + (index % 2) * 0.05);
      });
    },
  };
}
