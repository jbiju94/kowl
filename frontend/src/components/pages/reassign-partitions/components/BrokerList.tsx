import React, { Component } from "react";
import { Tag, Popover, Tooltip } from "antd";
import { LazyMap } from "../../../../utils/LazyMap";
import { Broker, Partition } from "../../../../state/restInterfaces";
import { api, brokerMap } from "../../../../state/backendApi";
import { computed } from "mobx";
import { QuickTable } from "../../../../utils/tsxUtils";
import { CheckIcon } from "@primer/octicons-v2-react";

// const tooltipMap = new LazyMap<number, JSX.Element>(id =>
//     <Tooltip>

//     </Tooltip>
//     );

type BrokerListProps = { brokerIds: number[]; addedIds?: number[], removedIds?: number[], leaderId?: number; } | { partition: Partition };


export class BrokerList extends Component<BrokerListProps> {
    render() {
        let leaderId: number;
        let sortedIds: number[];
        let offlineIds: number[] = [];
        let addedIds: number[] = [], removedIds: number[] = [];

        console.log('broker list', this.props);

        if ('partition' in this.props) {
            const { partition } = this.props;
            leaderId = partition.leader;
            sortedIds = partition.replicas.distinct().sort((a, b) => a - b);
            if (partition.offlineReplicas) offlineIds.push(...partition.offlineReplicas);
        } else {
            sortedIds = this.props.brokerIds.distinct().sort((a, b) => a - b);
            addedIds = this.props.addedIds ?? [];
            removedIds = this.props.removedIds ?? [];
            leaderId = this.props.leaderId ?? -1;
        }


        const brokers = brokerMap.get();

        const tags = sortedIds.map(id => {
            const broker = brokers?.get(id);

            let classNames = 'broker-tag';
            if (id == leaderId) classNames += " leader";
            if (offlineIds.includes(id)) classNames += ' offline';
            if (brokers && !broker) classNames += ' missing';

            const isAdding = addedIds.includes(id);
            if (isAdding) classNames += ' added';

            const isRemoving = removedIds.includes(id);
            if (isRemoving) classNames += ' removed';


            let brokerInfo = null;
            if (broker) brokerInfo = <div style={{ textAlign: 'left', maxWidth: '300px' }}>
                <b style={{ borderBottom: '1px solid', width: '100%', display: 'block', marginBottom: '5px', }}>Broker ID {id}</b>
                <div>{broker.address}</div>
                {broker.rack.length > 0 && <div>{broker.rack}</div>}
                {isAdding && <div style={{ color: 'hsl(102deg, 80%, 45%)', marginTop: '5px' }}>Partitions are currently being transferred to this broker.</div>}
                {isRemoving && <div style={{ color: 'hsl(38deg, 100%, 50%)', marginTop: '5px' }}>Once the assignment completes, the partitions of the reassignment will be removed from the broker.</div>}
            </div>

            return <Tooltip overlay={brokerInfo} trigger='click' placement='top'>
                <div className={classNames} style={{ display: 'inline-flex', fontWeight: 600 }}>
                    <span style={{ padding: '0 2px' }}>{id.toString()}</span>
                </div>
            </Tooltip>
        });

        return (
            <span style={{ cursor: 'pointer' }}>
                <span className='brokerTagList'>
                    {tags.map((t, i) => <React.Fragment key={i}>{t}</React.Fragment>)}
                </span>
            </span>
        );
    }
}
