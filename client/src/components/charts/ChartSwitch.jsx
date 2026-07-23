import React from 'react';
import LineChart from './LineChart.jsx';
import BarChart from './BarChart.jsx';
import Gauge from './Gauge.jsx';
import BooleanTimeline from './BooleanTimeline.jsx';
import Sparkline from './Sparkline.jsx';

/**
 * Dispatches a resolved (concrete) chart type to the matching chart, all fed the
 * same record. Used by MetricCard.
 *
 * @param {{ type:string, record:object, height?:number }} props
 */
export default function ChartSwitch({ type, record, height = 74 }) {
  const history = record.history;
  switch (type) {
    case 'line':
      return <LineChart history={history} height={height} />;
    case 'area':
      return <LineChart history={history} height={height} fill />;
    case 'bar':
      return <BarChart history={history} height={height} />;
    case 'gauge':
      return <Gauge history={history} value={record.value} height={height} />;
    case 'boolean':
      return <BooleanTimeline history={history} height={height} />;
    case 'sparkline':
      return (
        <div className="chart chart-spark" style={{ height }}>
          <Sparkline history={history} width={300} height={height} />
        </div>
      );
    default:
      return (
        <div className="chart chart-empty muted" style={{ height }}>
          no chart for this type
        </div>
      );
  }
}
