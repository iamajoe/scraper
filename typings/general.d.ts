// DEV: a way to import json easily
declare module '*.json' {
  const value: { [key: string]: any };
  export default value;
}
