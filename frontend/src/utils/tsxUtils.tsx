import React, { useState, Component, CSSProperties } from "react";
import { toJson } from "./jsonUtils";
import { simpleUniqueId, DebugTimerStore, prettyMilliseconds } from "./utils";
import { Radio, message, Progress, Skeleton, Popover, Tooltip } from 'antd';
import { MessageType } from "antd/lib/message";
import { CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { TimestampDisplayFormat } from "../state/ui";
import { observer } from "mobx-react";
import { motion } from "framer-motion";
import { animProps } from "./animationProps";
import { SizeType } from "antd/lib/config-provider/SizeContext";
import { api } from "../state/backendApi";
import { observable } from "mobx";
import { InfoIcon } from "@primer/octicons-v2-react";



const thousandsSeperator = (1234).toLocaleString()[1];

export function numberToThousandsString(n: number): JSX.Element {
    const parts = n.toLocaleString().split(thousandsSeperator);

    const result: JSX.Element[] = [];
    for (let i = 0; i < parts.length; i++) {
        const last = i == parts.length - 1;

        // Add the number block itself; React.Fragment is used explicitly to avoid missing key warning
        result.push(<React.Fragment key={i}>{parts[i]}</React.Fragment>);

        // Add a dot
        if (!last)
            result.push(<span key={i + '.'} className='noSelect'>{thousandsSeperator}</span>);
    }

    return <>{result}</>
}

@observer
export class TimestampDisplay extends Component<{ unixEpochSecond: number, format: TimestampDisplayFormat }>{
    render() {
        const { unixEpochSecond: ts, format } = this.props;
        if (format == 'relative') DebugTimerStore.Instance.useSeconds();

        switch (format) {
            case 'unixTimestamp': return new Date(ts).toUTCString();
            case 'onlyDate': return new Date(ts).toLocaleDateString();
            case 'onlyTime': return new Date(ts).toLocaleTimeString();
            case 'unixSeconds': return ts.toString();
            case 'relative': return prettyMilliseconds(Date.now() - ts, { compact: true }) + ' ago';
        }

        // format 'default' -> locale datetime
        return new Date(ts).toLocaleString();
    }
}



export const copyIcon = <svg viewBox="0 0 14 16" version="1.1" width="14" height="16" aria-hidden="true">
    <path fill-rule="evenodd" d="M2 13h4v1H2v-1zm5-6H2v1h5V7zm2 3V8l-3 3 3 3v-2h5v-2H9zM4.5 9H2v1h2.5V9zM2 12h2.5v-1H2v1zm9 1h1v2c-.02.28-.11.52-.3.7-.19.18-.42.28-.7.3H1c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1h3c0-1.11.89-2 2-2 1.11 0 2 .89 2 2h3c.55 0 1 .45 1 1v5h-1V6H1v9h10v-2zM2 5h8c0-.55-.45-1-1-1H8c-.55 0-1-.45-1-1s-.45-1-1-1-1 .45-1 1-.45 1-1 1H3c-.55 0-1 .45-1 1z"></path></svg>


const DefaultQuickTableOptions = {
    tableClassName: undefined as string | undefined,
    keyAlign: 'left' as 'left' | 'right' | 'center',
    valueAlign: 'left' as 'left' | 'right' | 'center',
    gapWidth: '16px' as string | number,
    gapHeight: 0 as string | number,
    keyStyle: undefined as React.CSSProperties | undefined,
    valueStyle: undefined as React.CSSProperties | undefined,
    tableStyle: undefined as React.CSSProperties | undefined,
}
type QuickTableOptions = Partial<typeof DefaultQuickTableOptions>

// [ { key: 'a', value: 'b' } ]
export function QuickTable(data: { key: any, value: any }[], options?: QuickTableOptions): JSX.Element;
// { 'key1': 'value1', 'key2': 'value2' }
export function QuickTable(data: { [key: string]: any }, options?: QuickTableOptions): JSX.Element;
// [ ['a', 'b'] ]
export function QuickTable(data: [any, any][], options?: QuickTableOptions): JSX.Element;

export function QuickTable(data: { key: any, value: any }[] | { [key: string]: any } | [any, any][], options?: QuickTableOptions): JSX.Element {
    let entries: { key: any, value: any }[];

    // plain object?
    if (typeof data === 'object' && !Array.isArray(data)) {
        // Convert to array of key value objects
        entries = [];
        for (const [k, v] of Object.entries(data))
            entries.push({ key: k, value: v });
    }
    // array of [any, any] ?
    else if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
        // Convert to array of key-value objects
        entries = (data as [any, any][]).map(ar => ({ key: ar[0], value: ar[1] }));
    }
    // already correct? array of { key:any, value:any }
    else {
        // Cast to correct type directly
        entries = data as { key: any, value: any }[];
    }

    const o = Object.assign({} as QuickTableOptions, DefaultQuickTableOptions, options);

    const showVerticalGutter = (typeof o.gapHeight === 'number' && o.gapHeight > 0) || typeof o.gapHeight === 'string';
    const classNames = [o.tableClassName, "quickTable"].joinStr(" ");

    return <table className={classNames} style={o.tableStyle}>
        <tbody>
            {entries.map((obj, i) =>
                <React.Fragment key={i}>
                    <tr>
                        <td style={{ textAlign: o.keyAlign, ...o.keyStyle }} className='keyCell'>{React.isValidElement(obj.key) ? obj.key : toSafeString(obj.key)}</td>
                        <td style={{ minWidth: '0px', width: o.gapWidth, padding: '0px' }}></td>
                        <td style={{ textAlign: o.valueAlign, ...o.valueStyle }} className='valueCell'>{React.isValidElement(obj.value) ? obj.value : toSafeString(obj.value)}</td>
                    </tr>

                    {showVerticalGutter && (i < entries.length - 1) &&
                        <tr>
                            <td style={{ padding: 0, paddingBottom: o.gapHeight }}></td>
                        </tr>
                    }
                </React.Fragment>
            )}
        </tbody>
    </table>
}

export function toSafeString(x: any): string {
    if (typeof x === 'undefined' || x === null) return "";
    if (typeof x === 'string') return x;
    if (typeof x === 'boolean' || typeof x === 'number') return String(x);
    return toJson(x);
}

export function ObjToKv(obj: any): { key: string, value: any }[] {
    const ar = [] as { key: string, value: any }[];
    for (let k in obj) {
        ar.push({ key: k, value: obj[k] })
    }
    return ar;
}

const style_flexColumn: CSSProperties = { display: 'flex', flexDirection: 'column' };
export const Label = (p: { text: string, textSuffix?: React.ReactNode, className?: string, style?: CSSProperties, children?: React.ReactNode }) => {
    const [id] = useState(() => simpleUniqueId(p.text));

    const child: React.ReactNode = p.children ?? <React.Fragment />;

    const newChild = Object.assign({}, child) as any;
    newChild.props = {};
    Object.assign(newChild.props, (child as any).props, { id: id });

    const divStyle = p.style ? { ...p.style, ...style_flexColumn } : p.style;

    return <>
        <div className={p.className} style={divStyle}>
            <div className='labelText'>
                <label htmlFor={id}>{p.text} {p.textSuffix}</label>
            </div>
            <div>
                {newChild}
            </div>
        </div>
    </>
}

export const TextInfoIcon = (p: { text: string, info: React.ReactNode, iconColor?: string, tooltipOverText?: boolean, iconSize?: string, maxWidth?: string }) => {
    const overlay = p.maxWidth == null ? p.info : <div style={{ maxWidth: p.maxWidth }}>{p.info}</div>

    const size = p.iconSize ?? '14px';

    const gray = 'hsl(0deg, 0%, 50%)';
    const blue = 'hsl(209deg, 100%, 55%)';
    const color = p.iconColor ?? gray;

    const icon = <span style={{ color: color, display: 'inline-flex', boxSizing: 'content-box', width: size }} ><InfoIcon /></span>

    if (p.tooltipOverText == null || p.tooltipOverText === true)
        return <Tooltip overlay={overlay} trigger="hover" mouseLeaveDelay={0}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {p.text}
                {icon}
            </span>
        </Tooltip>

    return <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {p.text}
        <Tooltip overlay={overlay} trigger="hover" mouseLeaveDelay={0}>
            {icon}
        </Tooltip>
    </span>
}

export class OptionGroup<T> extends Component<{
    label?: string,
    options: { [key: string]: any },
    value: T, onChange: (value: T) => void,
    children?: never,
    size?: SizeType,
}> {

    render() {
        const p = this.props;

        const radioGroup = (
            <Radio.Group value={p.value} onChange={e => p.onChange(e.target.value)} size={p.size ?? 'middle'}>
                {ObjToKv(p.options).map(kv =>
                    <Radio.Button key={kv.key} value={kv.value}>{kv.key}</Radio.Button>
                )}
            </Radio.Group>
        );

        if (!p.label) return radioGroup;

        return <Label text={p.label}>
            {radioGroup}
        </Label>
    }
}

export class RadioOptionGroup<T> extends Component<{
    options: {
        key?: any,
        value: T,
        title: string,
        text: string,
    }[],
    value: T, onChange: (value: T) => void,
    children?: never
}> {

    render() {
        const p = this.props;

        const radioGroup = (
            <Radio.Group className='radioOptionGroup' value={p.value} onChange={e => p.onChange(e.target.value)}>
                {p.options.map(kv =>
                    <Radio key={kv.key ?? kv.value} value={kv.value}>
                        <div style={{ fontWeight: 500, fontSize: '1.1em', display: 'inline-block', paddingBottom: '2px', paddingLeft: '10px', verticalAlign: 'middle' }}>{kv.title}</div>
                        <div style={{ marginLeft: '27px', color: '#BBB', whiteSpace: 'normal' }}>{kv.text}</div>
                    </Radio>
                )}
            </Radio.Group>
        );

        return radioGroup;
    }
}


interface StatusIndicatorProps {
    identityKey: string;
    fillFactor: number;
    statusText: string;
    bytesConsumed?: string;
    messagesConsumed?: string;
    progressText: string;
}

@observer
export class StatusIndicator extends Component<StatusIndicatorProps> {

    static readonly progressStyle: CSSProperties = { minWidth: '300px', lineHeight: 0 } as const;
    static readonly statusBarStyle: CSSProperties = { display: 'flex', fontFamily: '"Open Sans", sans-serif', fontWeight: 600, fontSize: '80%' } as const;
    static readonly progressTextStyle: CSSProperties = { marginLeft: 'auto', paddingLeft: '2em' } as const;

    hide: MessageType | undefined;

    timerHandle: NodeJS.Timeout;
    lastUpdateTimestamp: number;
    @observable showWaitingText: boolean;

    // used to fetch 'showWaitingText' (so mobx triggers a re-render).
    // we could just store the value in a local as well, but that might be opimized out.
    mobxSink: any | undefined = undefined;

    constructor(p: any) {
        super(p);
        message.config({ top: 20 });

        // Periodically check if we got any new messages. If not, show a different text after some time
        this.lastUpdateTimestamp = Date.now();
        this.showWaitingText = false;
        const waitMessageDelay = 3000;
        this.timerHandle = setInterval(() => {
            const age = Date.now() - this.lastUpdateTimestamp;
            if (age > waitMessageDelay) {
                this.showWaitingText = true;
            }
        }, 300);
    }

    componentDidMount() {
        this.lastUpdateTimestamp = Date.now();
        this.customRender();
    }

    lastPropsJson = "";
    lastProps = {};
    componentDidUpdate() {

        const curJson = toJson(this.props);
        if (curJson == this.lastPropsJson) {
            // changes to observables
            this.customRender();
            return;
        }

        this.lastPropsJson = curJson;

        this.lastUpdateTimestamp = Date.now();
        if (this.showWaitingText)
            this.showWaitingText = false;

        this.customRender();
    }

    componentWillUnmount() {
        clearInterval(this.timerHandle);
        this.hide?.call(this);
        this.hide = undefined;
    }

    customRender() {
        const content = <div style={{ marginBottom: '0.2em' }} className={this.showWaitingText ? 'waitingForMessagesBox waitingForMessagesText' : ''}>
            <div style={StatusIndicator.progressStyle}>
                <Progress percent={this.props.fillFactor * 100} showInfo={false} status='active' size='small' style={{ lineHeight: 1 }} />
            </div>
            <div style={StatusIndicator.statusBarStyle}>
                <div>{this.showWaitingText ? "Kafka is waiting for new messages..." : this.props.statusText}</div>
                <div style={StatusIndicator.progressTextStyle}>{this.props.progressText}</div>
            </div>
            {(this.props.bytesConsumed && this.props.messagesConsumed) &&
                <div style={StatusIndicator.statusBarStyle}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <DownloadOutlined /> {this.props.bytesConsumed}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                        <CopyOutlined />{this.props.messagesConsumed} messages
                    </div>
                </div>
            }
        </div>

        this.hide = message.open({ content: content, key: this.props.identityKey, icon: <span />, duration: null, type: 'loading' });
    }

    render() {
        // workaround to propagate the update (timer -> mobx -> re-render)
        this.mobxSink = this.showWaitingText;
        return null;
    }
}

// todo: layoutbypass and zerosizewrapper do the same thing, merge them.
export class LayoutBypass extends Component<{ width?: string, height?: string, justifyContent?: string, alignItems?: string }> {

    static readonly style: CSSProperties = {
        display: 'inline-flex',
        width: '0px', height: '0px',
        transform: 'translateY(-1px)',
        // zIndex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    };

    render() {
        const p = this.props;
        let style = LayoutBypass.style;
        if (p.width || p.height || p.justifyContent || p.alignItems) {
            style = Object.assign({}, style, p);
        }

        return <span className='verticalCenter' style={style}>
            <span>
                {this.props.children}
            </span>
        </span>
    }
}

export const ZeroSizeWrapper = (p: { width: number, height: number, children?: React.ReactNode }) => {
    return <span style={{
        width: p.width, height: p.height,
        display: 'inline-flex', placeContent: 'center', placeItems: 'center',

    }}>
        {p.children}
    </span>;
};


const defaultSkeletonStyle = { margin: '2rem' };
const innerSkeleton = <Skeleton loading={true} active={true} paragraph={{ rows: 8 }} />
export const DefaultSkeleton = (
    <motion.div {...animProps} key={'defaultSkeleton'} style={defaultSkeletonStyle}>
        {innerSkeleton}
    </motion.div>
);

// Single line string, no wrapping, will not overflow and display ellipsis instead
const ellipsisDivStyle: CSSProperties = {
    display: 'inline-block',
    width: 0,
    minWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    verticalAlign: 'text-bottom',
};
const ellipsisSpanStyle: CSSProperties = {
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    maxWidth: '100%',
    verticalAlign: 'text-bottom'
};
export const Ellipsis = (p: { children?: React.ReactNode, className?: string }) => {
    return <span className={p.className} style={ellipsisSpanStyle}>{p.children}</span>
}