
export { }

declare global {
    interface Array<T> {
        remove(obj: T): boolean;
        removeAll(selector: (x: T) => boolean): number;

        first<T>(this: T[], selector: (x: T) => boolean): T | undefined;
        last<T>(this: T[], selector?: (x: T) => boolean): T | undefined;

        count<T>(this: T[], selector: (x: T) => boolean): number;
        sum<T>(this: T[], selector: (x: T) => number): number;
        min<T>(this: T[], selector: (x: T) => number): number;
        max<T>(this: T[], selector: (x: T) => number): number;

        any<T>(this: T[], selector: (x: T) => boolean): boolean;
        all<T>(this: T[], selector: (x: T) => boolean): boolean;

        groupBy<T, K>(this: T[], selector: (x: T) => K): Map<K, T[]>;
        groupInto<T, K>(this: T[], selector: (x: T) => K): { key: K, items: T[] }[];

        distinct<T>(this: T[], keySelector?: ((x: T) => any)): T[];
        pushDistinct<T>(this: T[], ...elements: T[]): void;
        intersection<T>(this: T[], other: T[]): T[];
        except<T>(this: T[], other: T[]): T[];

        genericJoin<T>(this: T[], getSeparator: (last: T, current: T, index: number) => T): T[];
        joinStr(this: (string | null | undefined)[], separator: string): string;

        toMap<TItem, TKey, TValue>(this: TItem[], computeKey: (item: TItem) => TKey, computeValue: (item: TItem) => TValue): Map<TKey, TValue>;

        filterNull<T>(this: (T | null | undefined)[]): T[];
    }
}

Array.prototype.remove = function remove<T>(this: T[], obj: T): boolean {
    const index = this.indexOf(obj);
    if (index === -1) return false;
    this.splice(index, 1);
    return true;
};

Array.prototype.removeAll = function removeAll<T>(this: T[], selector: (x: T) => boolean): number {
    let count = 0;
    for (let i = 0; i < this.length; i++) {
        if (selector(this[i])) {
            this.splice(i, 1);
            count++;
            i--;
        }
    }
    return count;
};


Array.prototype.first = function first<T>(this: T[], selector: (x: T) => boolean): T | undefined {
    for (const e of this)
        if (selector(e))
            return e;
    return undefined;
};

Array.prototype.last = function last<T>(this: T[], selector?: (x: T) => boolean): T | undefined {
    for (let i = this.length - 1; i >= 0; i--)
        if (!selector || selector(this[i]))
            return this[i];
    return undefined;
};

Array.prototype.count = function count<T>(this: T[], selector: (x: T) => boolean) {
    return this.reduce((pre, cur) => selector(cur) ? pre + 1 : pre, 0);
};

Array.prototype.sum = function sum<T>(this: T[], selector: (x: T) => number) {
    return this.reduce((pre, cur) => pre + selector(cur), 0);
};

Array.prototype.min = function min<T>(this: T[], selector: (x: T) => number) {
    return this.reduce((pre, cur) => Math.min(pre, selector(cur)), 0);
};

Array.prototype.max = function max<T>(this: T[], selector: (x: T) => number) {
    return this.reduce((pre, cur) => Math.max(pre, selector(cur)), 0);
};


Array.prototype.any = function any<T>(this: T[], selector: (x: T) => boolean) {
    for (let e of this)
        if (selector(e))
            return true;
    return false;
};

Array.prototype.all = function all<T>(this: T[], selector: (x: T) => boolean) {
    for (let e of this)
        if (!selector(e))
            return false;
    return true;
};

Array.prototype.groupBy = function groupBy<T, K>(this: T[], keySelector: (x: T) => K): Map<K, T[]> {
    const map = new Map();
    this.forEach(item => {
        const key = keySelector(item);
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });
    return map;
};


Array.prototype.groupInto = function groupInto<T, K>(this: T[], keySelector: (x: T) => K): { key: K, items: T[] }[] {
    const map = this.groupBy(keySelector);

    const ar: { key: K, items: T[] }[] = [];
    map.forEach((items, key) => {
        ar.push({ key, items });
    })

    return ar;
};

Array.prototype.filterNull = function filterNull<T>(this: (T | null | undefined)[]): T[] {
    const ar: T[] = [];

    this.forEach(item => {
        if (item !== null && item !== undefined)
            ar.push(item);
    });

    return ar;
};


Array.prototype.distinct = function distinct<T>(this: T[], keySelector?: (x: T) => any): T[] {
    const selector = keySelector ? keySelector : (x: T) => x;

    const set = new Set<any>();
    const ar: T[] = [];

    this.forEach(item => {
        const key = selector(item);
        if (!set.has(key)) {
            set.add(key);
            ar.push(item);
        }
    });

    return ar;
};

Array.prototype.pushDistinct = function pushDistinct<T>(this: T[], ...elements: T[]): void {
    for (let e of elements)
        if (!this.includes(e))
            this.push(e);
};

Array.prototype.intersection = function intersection<T>(this: T[], other: T[]): T[] {
    const set = new Set<T>(this);
    const results: T[] = [];
    for (const e of other)
        if (set.has(e))
            results.push(e);
    return results;
};

Array.prototype.except = function except<T>(this: T[], other: T[]): T[] {
    const ar = [];
    const otherSet = new Set<T>(other);
    for (const e of this) {
        if (otherSet.has(e)) continue;
        ar.push(e);
    }
    return ar;
};

Array.prototype.genericJoin = function genericJoin<T>(this: T[], getSeparator: (last: T, current: T, index: number) => T): T[] {
    const ar = [];
    for (let i = 1; i < this.length; i++) {
        const last = this[i - 1];
        const current = this[i];

        const separator = getSeparator(last, current, i);

        ar.push(last);
        ar.push(separator);
    }

    // add final element
    ar.push(this[this.length - 1]);

    return ar;
};

Array.prototype.toMap = function toMap<TItem, TKey, TValue>(this: TItem[], computeKey: (item: TItem) => TKey, computeValue: (item: TItem) => TValue): Map<TKey, TValue> {
    const map = new Map<TKey, TValue>();

    for (const item of this) {
        const key = computeKey(item);
        const value = computeValue(item);
        map.set(key, value);
    }

    return map;
};

Array.prototype.joinStr = function joinStr(this: (string | null | undefined)[], separator: string): string {
    let r = "";
    for (const str of this) {
        if (str === null || str === undefined || str === "")
            continue;

        if (r.length == 0)
            r = str;
        else
            r += (separator + str);
    }

    return r;
};