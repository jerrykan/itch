/** returns a copy of arr with the item at `from` moved to `to` */
export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const startIndex = from < 0 ? result.length + from : from;
  if (startIndex >= 0 && startIndex < result.length) {
    const endIndex = to < 0 ? result.length + to : to;
    const [item] = result.splice(from, 1);
    result.splice(endIndex, 0, item);
  }
  return result;
}
