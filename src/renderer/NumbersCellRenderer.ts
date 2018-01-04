import {IDataRow, isMissingValue} from '../model';
import {DEFAULT_FORMATTER} from '../model/INumberColumn';
import NumbersColumn from '../model/NumbersColumn';
import {CANVAS_HEIGHT} from '../styles';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';
import {toHeatMapColor} from './HeatmapCellRenderer';
import IRenderContext, {IImposer} from './interfaces';
import {renderMissingValue} from './missing';
import {attr, forEachChild} from './utils';

export default class NumbersCellRenderer extends ANumbersCellRenderer {
  readonly title = 'Heatmap';

  protected createContext(col: NumbersColumn, context: IRenderContext, imposer?: IImposer) {
    const cellDimension = context.colWidth(col) / col.dataLength!;
    const labels = col.labels;
    let templateRows = '';
    for (let i = 0; i < col.dataLength!; ++i) {
      templateRows += `<div style="background-color: white" title=""></div>`;
    }
    return {
      templateRow: templateRows,
      update: (row: HTMLElement, data: number[], item: IDataRow) => {
        forEachChild(row, (d, i) => {
          const v = data[i];
          attr(<HTMLDivElement>d, {
            title: `${labels[i]}: ${DEFAULT_FORMATTER(v)}`,
            'class': isMissingValue(v) ? 'lu-missing' : ''
          }, {
            'background-color': isMissingValue(v) ? null : toHeatMapColor(v, item, col, imposer)
          });
        });
      },
      render: (ctx: CanvasRenderingContext2D, data: number[], item: IDataRow) => {
        data.forEach((d: number, j: number) => {
          const x = j * cellDimension;
          if (isMissingValue(d)) {
            renderMissingValue(ctx, cellDimension, CANVAS_HEIGHT, x, 0);
            return;
          }
          ctx.beginPath();
          ctx.fillStyle = toHeatMapColor(d, item, col, imposer);
          ctx.fillRect(x, 0, cellDimension, CANVAS_HEIGHT);
        });
      }
    };
  }
}
