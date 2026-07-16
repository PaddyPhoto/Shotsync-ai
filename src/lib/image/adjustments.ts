// ── Non-destructive image adjustments (WebGL) ────────────────────────────────
// A single GPU shader applies exposure / contrast / temperature / saturation.
// The SAME code renders the live lightbox preview and the full-res export pass,
// so what you see while editing is exactly what ships (WYSIWYG).
//
// Slider values are −100..100, 0 = no change. The recipe is stored per image on
// SessionImage.edit and only applied to pixels here — originals are never mutated.

export interface ImageEdit {
  exposure: number     // −100..100  (stops: ±1 stop at the extremes)
  contrast: number     // −100..100
  temperature: number  // −100..100  (− cooler/blue … + warmer/amber)
  saturation: number   // −100..100
}

export const DEFAULT_EDIT: ImageEdit = { exposure: 0, contrast: 0, temperature: 0, saturation: 0 }

export function isDefaultEdit(e?: ImageEdit | null): boolean {
  return !e || (e.exposure === 0 && e.contrast === 0 && e.temperature === 0 && e.saturation === 0)
}

export type AdjustmentSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  // map clip-space quad to texture coords, flipping Y so the image is upright
  v_uv = vec2((a_pos.x + 1.0) / 2.0, (1.0 - a_pos.y) / 2.0);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_exposure;  // stops
uniform float u_contrast;  // factor (1 = none)
uniform float u_temp;      // -1..1
uniform float u_sat;       // factor (1 = none)
void main() {
  vec4 c = texture2D(u_tex, v_uv);
  vec3 rgb = c.rgb;
  rgb *= pow(2.0, u_exposure);                       // exposure (multiplicative)
  rgb.r += u_temp * 0.12;                             // white balance: warm +R -B
  rgb.b -= u_temp * 0.12;
  rgb = (rgb - 0.5) * u_contrast + 0.5;              // contrast around mid-grey
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = mix(vec3(luma), rgb, u_sat);                 // saturation
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), c.a);
}`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('shader compile: ' + (gl.getShaderInfoLog(s) || ''))
  }
  return s
}

export interface AdjustmentRenderer {
  /** Draw `source` into the renderer's canvas with `edit` applied. */
  render(source: AdjustmentSource, edit: ImageEdit): void
  destroy(): void
}

// Attach an adjustment renderer to a canvas. The caller sizes the canvas to the
// source before rendering. The source texture is re-uploaded only when it
// changes, so slider drags (same source, new uniforms) are cheap → 60fps.
export function createAdjustmentRenderer(canvas: HTMLCanvasElement): AdjustmentRenderer {
  const gl = (canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true }) ||
    canvas.getContext('experimental-webgl', { premultipliedAlpha: false })) as WebGLRenderingContext | null
  if (!gl) throw new Error('WebGL unavailable')

  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('program link: ' + (gl.getProgramInfoLog(prog) || ''))
  }
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const posLoc = gl.getAttribLocation(prog, 'a_pos')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  const U = {
    exposure: gl.getUniformLocation(prog, 'u_exposure'),
    contrast: gl.getUniformLocation(prog, 'u_contrast'),
    temp: gl.getUniformLocation(prog, 'u_temp'),
    sat: gl.getUniformLocation(prog, 'u_sat'),
  }

  let uploaded: AdjustmentSource | null = null

  return {
    render(source, edit) {
      if (uploaded !== source) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource)
        uploaded = source
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform1f(U.exposure, edit.exposure / 100)      // ±1 stop
      gl.uniform1f(U.contrast, 1 + edit.contrast / 100)  // 0..2
      gl.uniform1f(U.temp, edit.temperature / 100)       // −1..1
      gl.uniform1f(U.sat, 1 + edit.saturation / 100)     // 0..2
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    destroy() {
      uploaded = null
      const lose = gl.getExtension('WEBGL_lose_context')
      lose?.loseContext()
    },
  }
}

// ── Export path ──────────────────────────────────────────────────────────────
// One reused offscreen renderer applies a recipe to a full-res source and hands
// back a canvas for the export pipeline to resize/crop. Returns null (no work)
// when the edit is a no-op.
let _offscreen: HTMLCanvasElement | null = null
let _offscreenRenderer: AdjustmentRenderer | null = null

export function renderAdjustmentsForExport(
  source: HTMLImageElement | HTMLCanvasElement,
  edit?: ImageEdit | null,
): HTMLCanvasElement | null {
  if (isDefaultEdit(edit)) return null
  const w = (source as HTMLImageElement).naturalWidth || source.width
  const h = (source as HTMLImageElement).naturalHeight || source.height
  if (!w || !h) return null
  if (!_offscreen) {
    _offscreen = document.createElement('canvas')
    _offscreenRenderer = createAdjustmentRenderer(_offscreen)
  }
  _offscreen.width = w
  _offscreen.height = h
  _offscreenRenderer!.render(source, edit as ImageEdit)
  // Copy to a fresh canvas synchronously so overlapping export calls (Promise.all)
  // never share the single offscreen GL buffer.
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d')!.drawImage(_offscreen, 0, 0)
  return out
}
