import {
  AmbientLight,
  BackSide,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three';

const SKY_RADIUS = 92;
const SKY_ZENITH = new Color('#7894B7');
const SKY_HORIZON = new Color('#D8C59A');
const SKY_NADIR = new Color('#6F8066');

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

function smoothstep(value: number): number {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}

function skyColorAt(vertical: number, target: Color): Color {
  if (vertical >= 0) {
    return target.lerpColors(SKY_HORIZON, SKY_ZENITH, smoothstep(vertical));
  }
  return target.lerpColors(SKY_HORIZON, SKY_NADIR, smoothstep(-vertical));
}

export function createSkyEnvironment(): Group {
  const environment = new Group();
  environment.name = 'environment:sky-and-fill';

  const geometry = new SphereGeometry(SKY_RADIUS, 32, 16);
  const positions = geometry.getAttribute('position');
  const colors: number[] = [];
  const color = new Color();
  for (let index = 0; index < positions.count; index += 1) {
    skyColorAt(positions.getY(index) / SKY_RADIUS, color);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

  const material = new MeshBasicMaterial({
    vertexColors: true,
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    fog: false,
  });
  const sky = new Mesh(geometry, material);
  sky.name = 'environment:gradient-sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;

  const fill = new AmbientLight('#C5CFB8', 0.42);
  fill.name = 'light:settlement-fill';

  environment.add(sky, fill);
  return environment;
}
