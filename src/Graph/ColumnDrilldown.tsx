import React, { Component, createRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import drilldown from 'highcharts/modules/drilldown';
import './Graph.css';
import { api } from '../api';

drilldown(Highcharts);

interface ColumnDrilldownProps {
  data?: { [key: string]: number };
  name: string;
}

interface ColumnDrilldownState {
  seriesData?: { name: string; y: number; drilldown: string }[];
  drilldownSeries?: {
    name: string;
    id: string;
    data: { name: string; y: number; drilldown?: string }[];
  }[];
}

interface DrilldownData {
  name: string;
  y: any;
  drilldown: string;
}

interface DrilldownSeries {
  name: string;
  id: string;
  data: DrilldownData[];
}

interface DrilldownItem {
  name: string;
  id: string;
  data: DrilldownData[];
}

export default class ColumnDrilldown extends Component<ColumnDrilldownProps, ColumnDrilldownState> {
  allowChartUpdate: boolean = true;
  state: ColumnDrilldownState = {
    seriesData: [],
    drilldownSeries: [],
  };

  chartComponentRef = createRef<HighchartsReact.RefObject>();

  async componentDidMount() {
    await this.updateData();
  }

  categoryClicked(e: Highcharts.PointClickEventObject): void {
    this.allowChartUpdate = false;
  }

  async updateData() {
    const { data } = this.props;
    if (data) {
      const drilldownSeries: DrilldownItem[] = [];
      const secondLevelDrilldownSeries: DrilldownSeries[] = [];
      const seriesDataPromises: Promise<DrilldownData | null>[] = Object.keys(data).map(async key => {
        const apiData = await api.downloads(key);
        if (!apiData) return null;
      
        const drilldownDataPromises: Promise<DrilldownData>[] = Object.keys(apiData).map(async apiDataKey => {
          const secondLevelApiData = await api.downloads(`${key}/${apiDataKey}`);
          const secondLevelDrilldownSeriesData: DrilldownData[] = Object.keys(secondLevelApiData).map(secondLevelApiKey => {
            return {
              name: secondLevelApiKey,
              y: secondLevelApiData[secondLevelApiKey],
              drilldown: secondLevelApiKey,
            };
          });
          secondLevelDrilldownSeries.push({
            name: apiDataKey,
            id: apiDataKey,
            data: secondLevelDrilldownSeriesData,
          });
      
          return {
            name: apiDataKey,
            y: apiData[apiDataKey],
            drilldown: apiDataKey,
          };
        });
      
        const drilldownSeriesData = await Promise.all(drilldownDataPromises);
        
        drilldownSeries.push({
          name: `JDK${key}`,
          id: key,
          data: drilldownSeriesData,
        });
      
        return {
          name: `JDK${key}`,
          y: data[key],
          drilldown: key,
        };
      });
      
      const seriesData = (await Promise.all(seriesDataPromises)).filter(Boolean) as DrilldownData[];
      
      drilldownSeries.push(...secondLevelDrilldownSeries)
      this.setState({
        seriesData,
        drilldownSeries: [...drilldownSeries, ...secondLevelDrilldownSeries],
      });
    }
  }

  render() {
    const { seriesData, drilldownSeries } = this.state;
    if (!seriesData || !drilldownSeries) return null;

    const { name } = this.props;
    const options = {
      chart: {
        type: 'column'
      },
      title: {
        text: name
      },
      subtitle: {
        text: 'Click the columns to view the version specific data. Data is from: <a href="https://api.adoptium.net/" target="_blank" rel="noopener noreferrer">api.adoptium.net</a>',
        useHTML: true
      },
      xAxis: {
        type: 'category'
      },
      yAxis: {
        title: {
          text: 'Downloads'
        }
      },
      plotOptions: {
        column: {
          dataLabels: {
            enabled: true,
            formatter: function () {
              if (!this || !this.y) return ''
              return Highcharts.numberFormat(this.y, 0, '.', ' ')
            }
          },
          pointPadding: 0.2,
          borderWidth: 0,
          minPointLength: 10,
          shadow: true
        }
      },
      series: [
        {
          events: {
            click: e => {
              this.categoryClicked(e)
            }
          },
          name: 'JDK Versions',
          data: seriesData
        }
      ],
      drilldown: {
        series: drilldownSeries
      }
    }
    return (
      <div className='chart'>
        <HighchartsReact
          allowChartUpdate={this.allowChartUpdate}
          ref={this.chartComponentRef}
          highcharts={Highcharts}
          options={options}
        />
      </div>
    );
  }
}