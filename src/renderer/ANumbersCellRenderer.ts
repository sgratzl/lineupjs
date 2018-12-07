import {LazyBoxPlotData} from '../internal';
import {IDataRow, IOrderedGroup} from '../model';
import {INumbersColumn} from '../model/INumberColumn';
import {default as IRenderContext, IImposer} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {ISequence} from '../internal/interable';

/** @internal */
export abstract class ANumbersCellRenderer {
  abstract readonly title: string;

  protected abstract createContext(col: INumbersColumn, context: IRenderContext, imposer?: IImposer): {
    clazz: string,
    templateRow: string,
    update: (row: HTMLElement, data: number[], raw: number[], d: IDataRow) => void,
    render: (ctx: CanvasRenderingContext2D, data: number[], d: IDataRow) => void,
  };

  static choose(col: INumbersColumn, rows: ISequence<IDataRow>) {
    let row: IDataRow | null = null;
    const data = rows.map((r, i) => {
      if (i === 0) {
        row = r;
      }
      return {n: col.getNumbers(r), raw: col.getRawNumbers(r)};
    });
    const cols = col.dataLength!;
    const normalized = <number[]>[];
    const raw = <number[]>[];
    // mean column)
    for (let i = 0; i < cols; ++i) {
      const vs = data.map((d) => ({n: d.n[i], raw: d.raw[i]})).filter((d) => !isNaN(d.n));
      if (vs.length === 0) {
        normalized.push(NaN);
        raw.push(NaN);
      } else {
        const box = <any>new LazyBoxPlotData(vs.map((d) => d.n));
        const boxRaw = <any>new LazyBoxPlotData(vs.map((d) => d.raw));
        normalized.push(box[col.getSortMethod()]);
        raw.push(boxRaw[col.getSortMethod()]);
      }
    }
    return {normalized, raw, row};
  }

  create(col: INumbersColumn, context: IRenderContext, imposer?: IImposer) {
    const width = context.colWidth(col);
    const {templateRow, render, update, clazz} = this.createContext(col, context, imposer);
    return {
      template: `<div class="${clazz}">${templateRow}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        update(n, col.getNumbers(d), col.getRawNumbers(d), d);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        render(ctx, col.getNumbers(d), d);
      },
    };
  }

  createGroup(col: INumbersColumn, context: IRenderContext, imposer?: IImposer) {
    const {templateRow, update, clazz} = this.createContext(col, context, imposer);
    return {
      template: `<div class="${clazz}">${templateRow}</div>`,
      update: (n: HTMLDivElement, group: IOrderedGroup) => {
        // render a heatmap
        return context.tasks.groupRows(col, group, (rows) => ANumbersCellRenderer.choose(col, rows)).then((data) => {
          update(n, data.normalized, data.raw, data.row!);
        });
      }
    };
  }
}

/** @internal */
export function matchRows(n: HTMLElement | SVGElement, length: number, template: string) {
  // first match the number of rows
  const children = <(HTMLElement | SVGElement)[]>Array.from(n.children);
  if (children.length > length) {
    children.slice(length).forEach((c) => c.remove());
  } else if (length > children.length) {
    n.insertAdjacentHTML('beforeend', template.repeat(length - children.length));
  }
}
