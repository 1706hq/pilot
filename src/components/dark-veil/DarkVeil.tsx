"use client"

import { Mesh, Program, Renderer, Triangle, Vec2 } from "ogl"
import { useEffect, useRef } from "react"

type DarkVeilProps = {
  hueShift?: number
  noiseIntensity?: number
  scanlineIntensity?: number
  speed?: number
  scanlineFrequency?: number
  warpAmount?: number
  resolutionScale?: number
}

const vertex = `
attribute vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}
`

const fragment = `
#ifdef GL_ES
precision lowp float;
#endif
uniform vec2 uResolution;
uniform float uTime;
uniform float uMotionSpeed;
uniform float uHueShift;
uniform float uNoise;
uniform float uScan;
uniform float uScanFreq;
uniform float uWarp;

float rand(vec2 c){return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453);}

mat3 rgb2yiq=mat3(0.299,0.587,0.114,0.596,-0.274,-0.322,0.211,-0.523,0.312);
mat3 yiq2rgb=mat3(1.0,0.956,0.621,1.0,-0.272,-0.647,1.0,-1.106,1.703);

vec3 hueShiftRGB(vec3 col,float deg){
  vec3 yiq=rgb2yiq*col;
  float rad=radians(deg);
  float cosh=cos(rad),sinh=sin(rad);
  vec3 yiqShift=vec3(yiq.x,yiq.y*cosh-yiq.z*sinh,yiq.y*sinh+yiq.z*cosh);
  return clamp(yiq2rgb*yiqShift,0.0,1.0);
}

float wave(vec2 uv, float offset) {
  float t = uTime * uMotionSpeed + offset;
  return sin(uv.x * 3.3 + t) * cos(uv.y * 2.7 - t * 0.8);
}

void main(){
  vec2 uv=gl_FragCoord.xy/uResolution.xy*2.0-1.0;
  uv.y*=-1.0;
  uv += uWarp * vec2(sin(uv.y * 6.283 + uTime * 0.08), cos(uv.x * 6.283 + uTime * 0.08)) * 0.05;

  float r = length(uv);
  float bloom = smoothstep(1.35, 0.08, r);
  float cloud = wave(uv, 0.1) * 0.5 + wave(uv * 1.7, 1.8) * 0.28 + wave(uv * 2.4, 3.1) * 0.14;
  vec3 deep = vec3(0.005, 0.013, 0.030);
  vec3 blue = vec3(0.028, 0.12, 0.30);
  vec3 ice = vec3(0.32, 0.48, 0.70);
  vec3 col = mix(deep, blue, bloom * (0.4 + cloud * 0.14));
  col = mix(col, ice, smoothstep(0.7, 1.0, bloom) * 0.08);
  col = hueShiftRGB(col, uHueShift);

  float scanline_val=sin(gl_FragCoord.y*uScanFreq)*0.5+0.5;
  col*=1.0-(scanline_val*scanline_val)*uScan;
  col+=(rand(gl_FragCoord.xy+uTime*0.18)-0.5)*uNoise;
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`

export default function DarkVeil({
  hueShift = 0,
  noiseIntensity = 0,
  scanlineIntensity = 0,
  speed = 0.5,
  scanlineFrequency = 0,
  warpAmount = 0,
  resolutionScale = 1,
}: DarkVeilProps) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return

    const renderer = new Renderer({
      canvas,
      dpr: Math.min(window.devicePixelRatio, 2),
    })
    const gl = renderer.gl
    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uMotionSpeed: { value: speed },
        uResolution: { value: new Vec2() },
        uHueShift: { value: hueShift },
        uNoise: { value: noiseIntensity },
        uScan: { value: scanlineIntensity },
        uScanFreq: { value: scanlineFrequency },
        uWarp: { value: warpAmount },
      },
    })
    const mesh = new Mesh(gl, { geometry, program })

    const resize = () => {
      const width = parent.clientWidth
      const height = parent.clientHeight
      renderer.setSize(width * resolutionScale, height * resolutionScale)
      program.uniforms.uResolution.value.set(width, height)
    }

    const start = performance.now()
    let frame = 0
    const loop = () => {
      program.uniforms.uTime.value = (performance.now() - start) / 1000
      program.uniforms.uMotionSpeed.value = speed
      program.uniforms.uHueShift.value = hueShift
      program.uniforms.uNoise.value = noiseIntensity
      program.uniforms.uScan.value = scanlineIntensity
      program.uniforms.uScanFreq.value = scanlineFrequency
      program.uniforms.uWarp.value = warpAmount
      renderer.render({ scene: mesh })
      frame = requestAnimationFrame(loop)
    }

    window.addEventListener("resize", resize)
    resize()
    loop()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [
    hueShift,
    noiseIntensity,
    resolutionScale,
    scanlineFrequency,
    scanlineIntensity,
    speed,
    warpAmount,
  ])

  return <canvas className="dark-veil-canvas" ref={ref} />
}
