import React, { memo, ReactNode, PureComponent, FunctionComponent, ReactElement, Component, Fragment, ReactNodeArray } from "react";
import { autorun, IReactionDisposer, observable } from "mobx";
import prettyBytesOriginal from "pretty-bytes";
import prettyMillisecondsOriginal from 'pretty-ms';
import url from "url";
import queryString from 'query-string';
import { editQuery } from "./queryHelper";
import { message } from "antd";
import { MessageType } from "antd/lib/message";



// Note: Making a <Memo> component is not possible, the container JSX will always render children first so they can be passed as props
export const nameof = <T>(name: Extract<keyof T, string>): string => name;

export class AutoRefresh extends Component {

    timerId: NodeJS.Timeout;

    componentDidMount() {
        this.reload = this.reload.bind(this);
        this.timerId = setInterval(() => this.reload(), 1000);
    }

    componentWillUnmount() {
        clearInterval(this.timerId);
    }

    reload() {
        this.forceUpdate();
    }

    render() {
        //let c = this.props.children as ReactNodeArray;
        //console.log('AutoRefresh.render(): ' + c.length + ' children');
        return (this.props.children);
    }
}

export class TimeSince {
    timestamp: number = Date.now();

    /** Reset timer back to 0 ms (or the given value). For example '1000' will set the timer as if it was started 1 second ago.  */
    reset(to: number = 0) {
        this.timestamp = Date.now() - to;
    }

    /** Time since last reset (or create) in ms */
    get value() {
        return Date.now() - this.timestamp;
    }
}

export class Cooldown {
    timestamp: number = 0; // time of last trigger
    duration: number = 0; // how long the CD takes to charge

    /**
     * @description Create a cooldown with the given duration
     * @param duration time the cooldown takes to complete in ms
     * @param start `running` to start 'on cooldown', `ready` to start already charged
     */
    constructor(duration: number, start: ('ready' | 'running') = 'running') {
        this.duration = duration;
        if (start === 'running') {
            this.timestamp = Date.now()
        }
    }

    /** Time (in ms) since the last time the cooldown was triggered */
    timeSinceLastTrigger(): number {
        return Date.now() - this.timestamp;
    }

    /** Time (in ms) until the cooldown is ready (or 0 if it is) */
    get timeLeft(): number {
        const t = this.duration - this.timeSinceLastTrigger();
        if (t < 0)
            return 0;
        return t;
    }

    // Check if ready
    get isReady(): boolean {
        return this.timeLeft <= 0;
    }

    // 'Use' the cooldown. Check if ready, and if it is also trigger it
    consume(force: boolean = false): boolean {
        if (this.timeLeft <= 0 || force) {
            this.timestamp = Date.now();
            return true;
        }
        return false;
    }

    // Force the cooldown to be ready
    setReady(): void {
        this.timestamp = 0;
    }

    // Same as 'consume(true)'
    restart(): void {
        this.timestamp = Date.now();
    }
}

export class Timer {
    target: number = 0;
    duration: number = 0;

    constructor(duration: number, initialState: ('started' | 'done') = 'started') {
        this.duration = duration;
        if (initialState === 'started') {
            this.target = Date.now() + duration;
        } else {
            this.target = 0;
        }
    }

    /** Time (in ms) until done (or 0) */
    get timeLeft() {
        let t = this.target - Date.now();
        if (t < 0)
            return 0;
        return t;
    }

    get isRunning() {
        return !this.isDone;
    }

    get isDone() {
        return this.timeLeft <= 0;
    }

    /** Restart timer */
    restart() {
        this.target = Date.now() + this.duration;
    }

    /** Set timer completed */
    setDone() {
        this.target = 0;
    }
}


export class DebugTimerStore {

    private static instance: DebugTimerStore;
    static get Instance() {
        if (!this.instance)
            this.instance = new DebugTimerStore();
        return this.instance;
    }

    @observable secondCounter = 0;
    @observable private frame = 0;

    private constructor() {
        this.increaseSec = this.increaseSec.bind(this);
        setInterval(this.increaseSec, 1000);

        this.increaseFrame = this.increaseFrame.bind(this);
        //setInterval(this.increaseFrame, 30);
    }

    private increaseSec() { this.secondCounter++; }
    private increaseFrame() { this.frame++; }

    public useSeconds() {
        this.mobxTrigger = this.secondCounter;
    }
    public useFrame() {
        this.mobxTrigger = this.frame;
    }

    mobxTrigger: any;
}


let refreshCounter = 0; // used to always create a different value, forcing some components to always re-render
export const alwaysChanging = () => refreshCounter = (refreshCounter + 1) % 1000;



export function assignDeep(target: any, source: any) {
    for (let key in source) {
        if (!source.hasOwnProperty(key)) continue;
        if (key === "__proto__" || key === "constructor") continue;

        const value = source[key];
        const existing = target[key];

        // if (existing === undefined && onlySetExisting) {
        // 	console.log('skipping key ' + key + ' because it doesnt exist in the target');
        // 	continue;
        // }

        if (typeof value === 'function' || typeof value === 'symbol') {
            //console.log('skipping key ' + key + ' because its type is ' + typeof value);
            continue;
        }

        if (typeof value === 'object') {

            if (!existing || typeof existing !== 'object')
                target[key] = value;
            else
                assignDeep(target[key], value);

            continue;
        }

        if (existing === value) continue;

        // console.log(`Key ["${key}"]:  ${JSON.stringify(existing)} ->  ${JSON.stringify(value)}`);

        target[key] = value;
    }

}

export function containsIgnoreCase(str: string, search: string): boolean {
    return str.toLowerCase().indexOf(search.toLowerCase()) >= 0;
}


const collator = new Intl.Collator(undefined, {
    usage: 'search',
    sensitivity: 'base',
});
export function compareIgnoreCase(a: string, b: string) {
    return collator.compare(a, b);
}

type FoundProperty = { propertyName: string, path: string[], value: any }
type PropertySearchOptions = { caseSensitive: boolean, returnFirstResult: boolean; }
type PropertySearchResult = 'continue' | 'abort';
type PropertySearchContext = { targetPropertyName: string, currentPath: string[], results: FoundProperty[], options: PropertySearchOptions }

// todo: this only finds the first match, what if we want to find all?
export function findElementDeep(obj: any, name: string, options: PropertySearchOptions): FoundProperty[] {
    const ctx: PropertySearchContext = {
        targetPropertyName: name,
        currentPath: [],
        results: [],
        options: options,
    };
    findElementDeep2(ctx, obj);
    return ctx.results;
}

function findElementDeep2(ctx: PropertySearchContext, obj: any): PropertySearchResult {
    for (let key in obj) {

        const value = obj[key];

        // property match?
        const isMatch = ctx.options.caseSensitive
            ? key === ctx.targetPropertyName
            : compareIgnoreCase(ctx.targetPropertyName, key) === 0;

        if (isMatch) {
            const clonedPath = Object.assign([], ctx.currentPath);
            ctx.results.push({ propertyName: key, path: clonedPath, value: value });

            if (ctx.options.returnFirstResult) return 'abort';
        }

        // descend into object
        if (typeof value === 'object') {
            ctx.currentPath.push(key);
            const childResult = findElementDeep2(ctx, value);
            ctx.currentPath.pop();

            if (childResult == 'abort')
                return 'abort';
        }
    }

    return 'continue';
}


export function getAllKeys(target: any): Set<string> {
    const set = new Set<string>();
    if (typeof target != 'object') return set;

    getAllKeysRecursive(target, set);
    return set;
}

function getAllKeysRecursive(target: any, keys: Set<string>) {
    const isArray = Array.isArray(target);
    for (let key in target) {

        // Add key name (but not array indices)
        if (!isArray) {
            keys.add(key);
        }

        // Descend into properties / elements
        const value = target[key];
        if (typeof value == 'object') {
            getAllKeysRecursive(value, keys);
        }
    }
}

const secToMs = 1000;
const minToMs = 60 * secToMs;
const hoursToMs = 60 * minToMs;
const daysToMs = 24 * hoursToMs;

export function hoursToMilliseconds(hours: number) {
    return hours * hoursToMs;
}

export const cullText = (str: string, length: number) => str.length > length ? `${str.substring(0, length - 3)}...` : str;

export function groupConsecutive(ar: number[]): number[][] {
    const groups: number[][] = [];

    for (let cur of ar) {
        const group = groups.length > 0 ? groups[groups.length - 1] : undefined;

        if (group) {
            const last = group[group.length - 1];
            if (last == cur - 1) {
                // We can extend the group
                group.push(cur);
                continue;
            }
        }

        groups.push([cur]);
    }

    return groups;
}

export const prettyBytesOrNA = function (n: number) {
    if (!isFinite(n) || n < 0) return "N/A";
    return prettyBytes(n);
}
export const prettyBytes = function (n: number) {
    if (typeof n === 'undefined' || n === null)
        return "N/A"; // null, undefined -> N/A

    if (typeof n !== 'number') {
        if (typeof n === 'string') {
            // string
            if (n === "")
                return "N/A"; // empty -> N/A

            n = parseFloat(String(n));

            if (!isFinite(n))
                return String(n); // "NaN" or "Infinity"

            // number parsed, fall through
        }
        else {
            // something else: object, function, ...
            return "NaN";
        }
    }

    // n is a finite number
    return prettyBytesOriginal(n);
}

export const prettyMilliseconds = function (n: number, options?: prettyMillisecondsOriginal.Options) {
    if (typeof n === 'undefined' || n === null)
        return "N/A"; // null, undefined -> N/A

    if (typeof n !== 'number') {
        if (typeof n === 'string') {
            // string
            if (n === "")
                return "N/A"; // empty -> N/A

            n = parseFloat(String(n));

            if (!isFinite(n))
                return String(n); // "NaN" or "Infinity"

            // number parsed, fall through
        }
        else {
            // something else: object, function, ...
            return "NaN";
        }
    }

    // n is a finite number
    return prettyMillisecondsOriginal(n, options);
}


/**
 * random digits and letters (entropy: 53bit)
 */
export function randomId() {
    return (Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
}

/**
 * "prefix-randomId()-randomId()"
 */
export function simpleUniqueId(prefix?: string) {
    return `${prefix}-${randomId()}-${randomId()}`;
}

/**
 * 4x 'randomId()'
 */
export function uniqueId4(): string {
    return randomId() + randomId() + randomId() + randomId();
}


export function titleCase(str: string): string {
    if (!str) return str;
    return str[0].toUpperCase() + str.slice(1);
}


// Bind an observable object to the url query
// - reads the current query parameters and sets them on the observable
// - whenever a prop in the observable changes, it updates the url
// You might want to use different names for the query parameters:
// observable = { propA: 5 }
// queryNames = { 'propA': 'x' }
// query => ?x=5

// export function bindObjectToUrl<
//     T extends { [key: string]: (number | string | number[] | string[]) },
// >(observable: T, queryNames: { [K in keyof T]?: string }): IReactionDisposer {
export function bindObjectToUrl<
    TObservable extends { [K in keyof TQueryNames]: (number | string | number[] | string[] | null | undefined) },
    TQueryNames extends { [K in keyof TObservable]: string },
    >(
        observable: { [K in keyof TQueryNames]: any },
        queryNames: TQueryNames,
        shouldInclude?: (propName: keyof TObservable, obj: TObservable) => boolean
    ): IReactionDisposer {

    const query = queryString.parse(window.location.search);

    // query -> observable
    for (const propName of Object.keys(queryNames) as [keyof TObservable]) {
        const queryName = queryNames[propName];

        let value = query[queryName as string];
        if (value == null) continue;

        if (Array.isArray(value)) {
            const allNum = value.all(v => Number.isFinite(Number(v)));
            const ar = allNum ? value.map(v => Number(v)) : value;
            observable[propName] = ar as any;
        } else {
            const v = Number.isFinite(Number(value)) ? Number(value) : value;
            observable[propName] = v as any;
        }
    }

    const disposer = autorun(() => {
        editQuery(query => {
            for (const propName of Object.keys(queryNames) as [keyof TObservable]) {

                const queryName = queryNames[propName];
                const newValue = observable[propName];

                if (shouldInclude && !shouldInclude(propName, observable)) {
                    query[queryName] = null;
                    continue;
                }

                if (newValue == null)
                    query[queryName] = null;
                else if (typeof newValue === 'boolean')
                    query[queryName] = String(Number(newValue));
                else
                    query[queryName] = String(newValue);

                // console.log('updated', { propName: propName, queryName: queryName, newValue: newValue });
            }
        })
    });

    return disposer;
}


type NoticeType = 'info' | 'success' | 'error' | 'warning' | 'loading';
export class Message {
    private key: string;
    private hideFunc: MessageType;

    constructor(private text: string, private type: NoticeType = 'loading', private duration: number | null = 0) {
        this.key = randomId();
        this.update();
    }

    private update() {
        this.hideFunc = message.open({
            content: this.text,
            key: this.key,
            type: this.type,
            duration: this.duration,
        });
    }

    hide() {
        this.hideFunc();
    }

    setLoading(text?: string) {
        if (text) this.text = text;
        this.type = 'loading';
        this.duration = 0;
        this.update();
    }

    setSuccess(text?: string) {
        if (text) this.text = text;
        this.type = 'success';
        this.duration = 3;
        this.update();
    }

    setError(text?: string) {
        if (text) this.text = text;
        this.type = 'error';
        this.duration = 3;
        this.update();
    }
}