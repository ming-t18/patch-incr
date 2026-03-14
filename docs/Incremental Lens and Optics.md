# Incremental Lens and Optics

## Isomorphism Optics

## Entries list Optics

```typescript
type PathList<T> = ([Path, unknown])[];

type EntriesListOptics<T> = IIso<T, PathList<T>>;

const decomposePathList: <A, Residual>(paths: Path[]): IF<A, [PathList<A>, Residual]> = ...;
const assignPaths: <A>(): IF<[A, PathList<A>], A> = ...;
```
