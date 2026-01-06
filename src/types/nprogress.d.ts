declare module "nprogress" {
  export interface NProgressOptions {
    minimum?: number;
    easing?: string;
    speed?: number;
    trickle?: boolean;
    trickleSpeed?: number;
    showSpinner?: boolean;
    parent?: string;
  }

  export interface NProgressStatic {
    configure(options: NProgressOptions): NProgressStatic;
    start(): NProgressStatic;
    set(n: number): NProgressStatic;
    inc(amount?: number): NProgressStatic;
    done(force?: boolean): NProgressStatic;
    remove(): void;
  }

  const NProgress: NProgressStatic;
  export default NProgress;
}