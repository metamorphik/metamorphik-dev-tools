import * as React from "react"
import type { PropsWithChildren } from "react"
import { type UseClassifiedSpec, type BehaviorInstance, PlatformStrapperSpecs } from "./types"
import useClassified from "./useClassified"

export type ClassifiedComponent<Expose = any, P = {}> =
  React.FC<PropsWithChildren<P>> & {
    __kind: "ClassifiedComponent"
    __useInside: (props: PropsWithChildren<P>) => BehaviorInstance<Expose, P>
    __spec: UseClassifiedSpec<Expose, P>
    __base?: ClassifiedComponent<any, any>
    __platformStrapper?: PlatformStrapperSpecs
  }

export function createClassifiedComponent<Expose = any, P = {}>(
  spec: UseClassifiedSpec<Expose, P>,
  platformStrapper?: PlatformStrapperSpecs
): ClassifiedComponent<Expose, P>
export function createClassifiedComponent<Expose = any, P = {}>(
  base: ClassifiedComponent<any, any> | null,
  spec: UseClassifiedSpec<Expose, P>,
  platformStrapper?: PlatformStrapperSpecs
): ClassifiedComponent<Expose, P>

export function createClassifiedComponent<Expose = any, P = {}>(
  a: any, b?: any, c?: any
): ClassifiedComponent<Expose, P> {
  const isDerived = b !== undefined
  const base = (b ? a : null) as ClassifiedComponent<any, any> | null
  const spec = (b ?? a) as UseClassifiedSpec<Expose, P>
  const platformStrapper = (isDerived ? c : b) as PlatformStrapperSpecs | undefined
  
  const __useInside = (props: PropsWithChildren<P>) => {
    const baseInst = base ? base.__useInside(props) : null
    return useClassified<Expose, P>(baseInst, spec, props, platformStrapper)
  }

  const Comp: Partial<ClassifiedComponent<Expose, P>> = (props: PropsWithChildren<P>) => {
    const inst = __useInside(props)
    // ✅ pull the component into a variable (avoids "Cannot find namespace 'inst'")
    const View = inst.View as React.FC<PropsWithChildren<P>>
    return <View {...props} />
    // Alternatively:
    // return React.createElement(inst.View as React.FC<PropsWithChildren<P>>, props)
  }

  Comp.__kind = "ClassifiedComponent"
  Comp.__useInside = __useInside
  Comp.__spec = spec
  if (base) Comp.__base = base
  if (platformStrapper) Comp.__platformStrapper = platformStrapper
  ;(Comp as React.FC).displayName = spec.name ?? "Classified"

  return Comp as ClassifiedComponent<Expose, P>
}
