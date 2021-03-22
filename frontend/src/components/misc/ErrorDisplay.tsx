import React from 'react';
import { observer } from "mobx-react";
import { Result } from 'antd';
import { Button } from 'antd';
import { api } from '../../state/backendApi';
import { CloseCircleOutlined } from '@ant-design/icons'
import { toJson } from "../../utils/jsonUtils";


@observer
export class ErrorDisplay extends React.Component {
    render() {
        if (api.errors.length === 0)
            return this.props.children;

        return <>
            <Result style={{ margin: 0, padding: 0 }} status={500} title="Backend API Error" subTitle="Something went wrong while pulling data from the backend server" />
            <div style={{ margin: '2em 2em', display: 'flex', flexDirection: 'column' }}>
                <Button type="primary" size="large" style={{ width: '12em', alignSelf: 'center' }} onClick={clearErrors}>Retry</Button>

                <div className="error-list">
                    {api.errors.map((e, i) => <div key={i}>
                        <CloseCircleOutlined style={{ color: 'red' }} /> {formatError(e)}
                    </div>)}
                </div>
            </div>
        </>;
    }
}

function formatError(err: any): string {
    if (err instanceof Error && err.message) {
        return err.message;
    }
    return String(err);
}

function clearErrors() {
    api.errors = [];
}
