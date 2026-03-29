/*
 *
 Registration example
```ts
declare module "patch-incr-arrow/hkt" {
	interface ArrToType1<A, B> {
		readonly TEST: (x: A) => B;
	}
}
type Test1 = ArrToType1<number, string>["TEST"];
```
*/
