// Minimal JSX type augmentation so TypeScript accepts the `key` prop on custom components
// without requiring @types/react to be installed.
declare namespace JSX {
  interface IntrinsicAttributes {
    key?: string | number | null | undefined;
  }
}
