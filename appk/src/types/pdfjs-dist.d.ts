declare interface SetIterator<T> extends Iterator<T> {
  next(): IteratorResult<T>;
}