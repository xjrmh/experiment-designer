declare module 'jstat' {
  interface JStatStatic {
    normal: {
      inv(p: number, mean: number, std: number): number
      cdf(x: number, mean: number, std: number): number
    }
  }
  const jStat: JStatStatic
  export default jStat
}
