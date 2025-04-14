export interface IncrContext {
	getCache<F extends WeakKey, K, V>(func: F): Map<K, V>;
}
