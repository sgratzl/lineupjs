import {equalArrays, fixCSS} from '../internal';
import AEventDispatcher, {suffix} from '../internal/AEventDispatcher';
import {isSupportType} from './annotations';
import Column, {IColumnParent, IFlatColumn, visibilityChanged, dirtyValues, dirtyHeader, labelChanged, widthChanged, dirty} from './Column';
import {defaultGroup, IOrderedGroup} from './Group';
import {isCategoricalColumn} from './ICategoricalColumn';
import {IDataRow, IGroup, IGroupData} from './interfaces';
import {joinGroups} from './internal';
import StringColumn from './StringColumn';
import NumberColumn, {filterChanged} from './NumberColumn';
import CompositeColumn from './CompositeColumn';
import {IEventListener} from '../internal/AEventDispatcher';

export interface ISortCriteria {
  readonly col: Column;
  readonly asc: boolean;
}


/**
 * emitted when a column has been added
 * @asMemberOf Ranking
 * @event
 */
export declare function addColumn(col: Column, index: number): void;

/**
 * emitted when a column has been moved within this composite columm
 * @asMemberOf Ranking
 * @event
 */
export declare function moveColumn(col: Column, index: number, oldIndex: number): void;

/**
 * emitted when a column has been removed
 * @asMemberOf Ranking
 * @event
 */
export declare function removeColumn(col: Column, index: number): void;
/**
 * emitted when the sort criteria propery changes
 * @asMemberOf Ranking
 * @event
 */
export declare function sortCriteriaChanged(previous: ISortCriteria[], current: ISortCriteria[]): void;
/**
 * emitted when the sort criteria propery changes
 * @asMemberOf Ranking
 * @event
 */
export declare function groupCriteriaChanged(previous: Column[], current: Column[]): void;
/**
 * emitted when the sort criteria propery changes
 * @asMemberOf Ranking
 * @event
 */
export declare function groupSortCriteriaChanged(previous: ISortCriteria[], current: ISortCriteria[]): void;
/**
 * emitted when the sort criteria propery changes
 * @asMemberOf Ranking
 * @event
 */
export declare function dirtyOrder(): void;
/**
 * @asMemberOf Ranking
 * @event
 */
export declare function orderChanged(previous: number[], current: number[], previousGroups: IOrderedGroup[], currentGroups: IOrderedGroup[]): void;
/**
 * @asMemberOf Ranking
 * @event
 */
export declare function groupsChanged(previous: number[], current: number[], previousGroups: IOrderedGroup[], currentGroups: IOrderedGroup[]): void;

/**
 * a ranking
 */
export default class Ranking extends AEventDispatcher implements IColumnParent {
  static readonly EVENT_WIDTH_CHANGED = Column.EVENT_WIDTH_CHANGED;
  static readonly EVENT_FILTER_CHANGED = NumberColumn.EVENT_FILTER_CHANGED;
  static readonly EVENT_LABEL_CHANGED = Column.EVENT_LABEL_CHANGED;
  static readonly EVENT_ADD_COLUMN = CompositeColumn.EVENT_ADD_COLUMN;
  static readonly EVENT_MOVE_COLUMN = CompositeColumn.EVENT_MOVE_COLUMN;
  static readonly EVENT_REMOVE_COLUMN = CompositeColumn.EVENT_REMOVE_COLUMN;
  static readonly EVENT_DIRTY = Column.EVENT_DIRTY;
  static readonly EVENT_DIRTY_HEADER = Column.EVENT_DIRTY_HEADER;
  static readonly EVENT_DIRTY_VALUES = Column.EVENT_DIRTY_VALUES;
  static readonly EVENT_COLUMN_VISIBILITY_CHANGED = Column.EVENT_VISIBILITY_CHANGED;
  static readonly EVENT_SORT_CRITERIA_CHANGED = 'sortCriteriaChanged';
  static readonly EVENT_GROUP_CRITERIA_CHANGED = 'groupCriteriaChanged';
  static readonly EVENT_GROUP_SORT_CRITERIA_CHANGED = 'groupSortCriteriaChanged';
  static readonly EVENT_DIRTY_ORDER = 'dirtyOrder';
  static readonly EVENT_ORDER_CHANGED = 'orderChanged';
  static readonly EVENT_GROUPS_CHANGED = 'groupsChanged';


  /**
   * the list of sort criteria
   * @type {Array}
   */
  private readonly sortCriteria: ISortCriteria[] = [];
  private readonly groupSortCriteria: ISortCriteria[] = [];

  private readonly groupColumns: Column[] = [];

  /**
   * columns of this ranking
   * @type {Array}
   * @private
   */
  private readonly columns: Column[] = [];

  readonly comparator = (a: IDataRow, b: IDataRow) => {
    if (this.sortCriteria.length === 0) {
      return 0;
    }
    for (const sort of this.sortCriteria) {
      const r = sort.col!.compare(a, b);
      if (r !== 0) {
        return sort.asc ? r : -r;
      }
    }
    return a.i - b.i; //to have a deterministic order
  };

  readonly groupComparator = (a: IGroupData, b: IGroupData) => {
    if (this.groupSortCriteria.length === 0) {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    }
    for (const sort of this.groupSortCriteria) {
      const r = sort.col!.groupCompare(a, b);
      if (r !== 0) {
        return sort.asc ? r : -r;
      }
    }
    return a.name.localeCompare(b.name);
  };

  readonly grouper = (row: IDataRow): IGroup => {
    const g = this.groupColumns;
    switch (g.length) {
      case 0:
        return defaultGroup;
      case 1:
        return g[0].group(row);
      default:
        const groups = g.map((gi) => gi.group(row));
        return joinGroups(groups);
    }
  };

  readonly dirtyOrder = () => {
    this.fire([Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], this.getSortCriteria());
  };

  /**
   * the current ordering as an sorted array of indices
   * @type {Array}
   */
  private groups: IOrderedGroup[] = [Object.assign({order: <number[]>[]}, defaultGroup)];

  constructor(public id: string, private maxSortCriteria = 2, private maxGroupColumns = 1) {
    super();
    this.id = fixCSS(id);
  }

  protected createEventList() {
    return super.createEventList().concat([
      Ranking.EVENT_WIDTH_CHANGED, Ranking.EVENT_FILTER_CHANGED,
      Ranking.EVENT_LABEL_CHANGED, Ranking.EVENT_GROUPS_CHANGED,
      Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_MOVE_COLUMN,
      Ranking.EVENT_DIRTY, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES,
      Ranking.EVENT_GROUP_SORT_CRITERIA_CHANGED, Ranking.EVENT_COLUMN_VISIBILITY_CHANGED,
      Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_ORDER_CHANGED]);
  }

  on(type: typeof Ranking.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Ranking.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  on(type: typeof Ranking.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Ranking.EVENT_ADD_COLUMN, listener: typeof addColumn | null): this;
  on(type: typeof Ranking.EVENT_MOVE_COLUMN, listener: typeof moveColumn | null): this;
  on(type: typeof Ranking.EVENT_REMOVE_COLUMN, listener: typeof removeColumn | null): this;
  on(type: typeof Ranking.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Ranking.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Ranking.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Ranking.EVENT_COLUMN_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: typeof Ranking.EVENT_SORT_CRITERIA_CHANGED, listener: typeof sortCriteriaChanged | null): this;
  on(type: typeof Ranking.EVENT_GROUP_CRITERIA_CHANGED, listener: typeof groupCriteriaChanged | null): this;
  on(type: typeof Ranking.EVENT_GROUP_SORT_CRITERIA_CHANGED, listener: typeof groupSortCriteriaChanged | null): this;
  on(type: typeof Ranking.EVENT_DIRTY_ORDER, listener: typeof dirtyOrder | null): this;
  on(type: typeof Ranking.EVENT_ORDER_CHANGED, listener: typeof orderChanged | null): this;
  on(type: typeof Ranking.EVENT_GROUPS_CHANGED, listener: typeof groupsChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this;
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  assignNewId(idGenerator: () => string) {
    this.id = fixCSS(idGenerator());
    this.columns.forEach((c) => c.assignNewId(idGenerator));
  }

  setOrder(order: number[]) {
    this.setGroups([Object.assign({order}, defaultGroup)]);
  }

  setGroups(groups: IOrderedGroup[]) {
    const old = this.getOrder();
    const oldGroups = this.groups;
    this.groups = groups;
    this.fire([Ranking.EVENT_ORDER_CHANGED, Ranking.EVENT_GROUPS_CHANGED, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], old, this.getOrder(), oldGroups, groups);
  }

  getOrder() {
    switch (this.groups.length) {
      case 0:
        return [];
      case 1:
        return this.groups[0].order;
      default:
        return (<number[]>[]).concat(...this.groups.map((g) => g.order));
    }
  }

  getGroups() {
    return this.groups.slice();
  }

  dump(toDescRef: (desc: any) => any) {
    const r: any = {};
    r.columns = this.columns.map((d) => d.dump(toDescRef));
    r.sortCriterias = this.sortCriteria.map((s) => ({asc: s.asc, sortBy: s.col!.id}));
    r.groupColumns = this.groupColumns.map((d) => d.id);
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    this.clear();
    dump.columns.map((child: any) => {
      const c = factory(child);
      if (c) {
        this.push(c);
      }
    });
    // compatibility case
    if (dump.sortColumn && dump.sortColumn.sortBy) {
      const help = this.columns.filter((d) => d.id === dump.sortColumn.sortBy);
      this.sortBy(help.length === 0 ? null : help[0], dump.sortColumn.asc);
    }
    if (dump.groupColumns) {
      const groupColumns = dump.groupColumns.map((id: string) => this.columns.find((d) => d.id === id));
      this.groupBy(groupColumns);
    }

    const restoreSortCriteria = (dumped: any) => {
      return dumped.map((s: { asc: boolean, sortBy: string }) => {
        return {
          asc: s.asc,
          col: this.columns.find((d) => d.id === s.sortBy) || null
        };
      }).filter((s: any) => s.col);
    };

    if (dump.sortCriterias) {
      this.setSortCriteria(restoreSortCriteria(dump.sortCriterias));
    }

    if (dump.groupSortCriterias) {
      this.setGroupSortCriteria(restoreSortCriteria(dump.groupSortCriterias));
    }
  }

  flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0) {
    let acc = offset; // + this.getWidth() + padding;
    if (levelsToGo > 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
      this.columns.forEach((c) => {
        if (c.getVisible() && levelsToGo <= Column.FLAT_ALL_COLUMNS) {
          acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
        }
      });
    }
    return acc - offset;
  }

  getPrimarySortCriteria(): ISortCriteria | null {
    if (this.sortCriteria.length === 0) {
      return null;
    }
    return this.sortCriteria[0];
  }

  getSortCriteria(): ISortCriteria[] {
    return this.sortCriteria.map((d) => Object.assign({}, d));
  }

  getGroupSortCriteria(): ISortCriteria[] {
    return this.groupSortCriteria.map((d) => Object.assign({}, d));
  }

  toggleSorting(col: Column) {
    const categoricals = this.groupColumns.reduce((acc, d) => acc + (isCategoricalColumn(d) ? 1 : 0), 0);

    { // toggle respecting
      const first = this.sortCriteria[categoricals];
      if(first && first.col === col) {
        const newSort = this.sortCriteria.slice();
        newSort[categoricals] = {col, asc: !first.asc};
        return this.setSortCriteria(newSort);
      }
    }

    if (categoricals <= 0) {
      return this.sortBy(col);
    }


    // need to preserve synced order
    const old = this.sortCriteria.findIndex((d) => d.col === col);
    const newSort = this.sortCriteria.slice();
    if (old > 0 && old === categoricals) {
      // kind of primary -> toggle
      newSort[old] = {col, asc: !newSort[old].asc};
    } else if (old > 0) {
      //remove
      newSort.splice(old, 1);
    } else {
      newSort.splice(categoricals, 0, {col, asc: false});
    }
    return this.setSortCriteria(newSort);
  }

  toggleGrouping(col: Column) {
    const old = this.groupColumns.indexOf(col);
    if (old >= 0) {
      const newGroupings = this.groupColumns.slice();
      newGroupings.splice(old, 1);
      if (isCategoricalColumn(col) && this.sortCriteria[old] && this.sortCriteria[old].col === col) {
        // categorical synced sorting
        this.sortCriteria.splice(old, 1);
      }
      return this.groupBy(newGroupings);
    }
    if (isCategoricalColumn(col)) {
      // sync with sorting
      const oldSort = this.sortCriteria.findIndex((d) => d.col === col);
      if (oldSort >= 0) {
        this.sortCriteria.splice(oldSort, 1);
      }
      this.setSortCriteria([{col: <Column>col, asc: true}].concat(this.sortCriteria));
    }
    return this.groupBy([col].concat(this.groupColumns));
  }

  getGroupCriteria() {
    return this.groupColumns.slice();
  }

  setGroupCriteria(columns: Column[]) {
    return this.groupBy(columns);
  }

  sortBy(col: Column | null, ascending: boolean = false) {
    if (col != null && col.findMyRanker() !== this) {
      return false; //not one of mine
    }
    const primary = this.getPrimarySortCriteria();
    if ((col == null && primary == null) || (primary && primary.col === col && primary.asc === ascending)) {
      return true; //already in this order
    }
    const bak = this.getSortCriteria();

    if (col) {
      const existing = this.sortCriteria.findIndex((d) => d.col === col);
      if (existing >= 0) { //remove index
        this.sortCriteria.splice(existing, 1);
        // can skip deregister will be reregistered anyhow
      } else if (this.sortCriteria.length === this.maxSortCriteria) {
        // remove the last one
        const last = this.sortCriteria.pop()!;
        last.col.on(`${Column.EVENT_DIRTY_VALUES}.order`, null);
        last.col.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.order`, null);
      }
    } else {
      this.sortCriteria.forEach((s) => {
        s.col.on(`${Column.EVENT_DIRTY_VALUES}.order`, null);
        s.col.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.order`, null);
      });
      this.sortCriteria.splice(0, this.sortCriteria.length);
    }

    if (col) { //enable dirty listening
      // add as first
      this.sortCriteria.unshift({
        col,
        asc: ascending
      });
      col.on(`${Column.EVENT_DIRTY_VALUES}.order`, this.dirtyOrder);
      // order is dirty if the sort method has changed
      col.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.order`, this.dirtyOrder);
    }
    this.triggerResort(bak);
    return true;
  }

  groupBy(col: Column | null | Column[]) {
    let cols = Array.isArray(col) ? col : (col instanceof Column ? [col] : []);
    // trim
    if (cols.length > this.maxGroupColumns) {
      cols = cols.slice(0, this.maxGroupColumns);
    }

    if (equalArrays(this.groupColumns, cols)) {
      return true; //same
    }
    this.groupColumns.forEach((groupColumn) => {
      groupColumn.on(suffix('.group', Column.EVENT_DIRTY_VALUES, NumberColumn.EVENT_SORTMETHOD_CHANGED, NumberColumn.EVENT_GROUPING_CHANGED), null);
    });

    const bak = this.groupColumns.slice();
    this.groupColumns.splice(0, this.groupColumns.length, ...cols);

    this.groupColumns.forEach((groupColumn) => {
      groupColumn.on(suffix('.group', Column.EVENT_DIRTY_VALUES, NumberColumn.EVENT_SORTMETHOD_CHANGED, NumberColumn.EVENT_GROUPING_CHANGED), this.dirtyOrder);
    });

    this.fire([Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_HEADER,
      Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], bak, this.getGroupCriteria());
    return true;
  }

  setSortCriteria(value: ISortCriteria | ISortCriteria[]) {
    let values = Array.isArray(value) ? value : [value];
    // trim
    if (values.length > this.maxSortCriteria) {
      values = values.slice(0, this.maxSortCriteria);
    }

    if (values.length === 0) {
      return this.sortBy(null);
    }
    if (values.length === 1) {
      return this.sortBy(values[0].col, values[0].asc);
    }
    const bak = this.sortCriteria.slice();

    // update listener
    bak.forEach((d) => {
      d.col.on(`${Column.EVENT_DIRTY_VALUES}.order`, null!);
      d.col.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.order`, null!);
    });

    values.forEach((d) => {
      d.col.on(`${Column.EVENT_DIRTY_VALUES}.order`, this.dirtyOrder);
      d.col.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.order`, this.dirtyOrder);
    });
    this.sortCriteria.splice(0, this.sortCriteria.length, ...values.slice());
    this.triggerResort(bak);
    return true;
  }

  toggleGroupSorting(col: Column) {
    const first = this.groupSortCriteria[0];
    const asc = first && first.col === col && !first.asc;
    return this.setGroupSortCriteria({col, asc});
  }

  groupSortBy(col: Column, asc: boolean) {
    return this.setGroupSortCriteria({col, asc});
  }

  setMaxSortCriteria(maxSortCriteria: number) {
    const old = this.maxSortCriteria;
    if (old === maxSortCriteria) {
      return;
    }
    this.maxSortCriteria = maxSortCriteria;
    if (old < maxSortCriteria || this.sortCriteria.length < maxSortCriteria) {
      return;
    }
    // check if we have to slice
    this.setSortCriteria(this.sortCriteria.slice(0, maxSortCriteria));
  }

  getMaxSortCriteria() {
    return this.maxSortCriteria;
  }

  setMaxGroupColumns(maxGroupColumns: number) {
    const old = this.maxGroupColumns;
    if (old === maxGroupColumns) {
      return;
    }
    this.maxGroupColumns = maxGroupColumns;
    if (old < maxGroupColumns || this.groupColumns.length < maxGroupColumns) {
      return;
    }
    // check if we have to slice
    this.setGroupCriteria(this.groupColumns.slice(0, maxGroupColumns));
  }

  getMaxGroupColumns() {
    return this.maxGroupColumns;
  }

  setGroupSortCriteria(value: ISortCriteria | ISortCriteria[]) {
    let values = Array.isArray(value) ? value : [value];
    // trim
    if (values.length > this.maxSortCriteria) {
      values = values.slice(0, this.maxSortCriteria);
    }

    this.groupSortCriteria.forEach((d) => {
      d.col.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.groupOrder`, null!);
    });

    values.forEach((d) => {
      d.col.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.groupOrder`, this.dirtyOrder);
    });
    this.groupSortCriteria.splice(0, this.groupSortCriteria.length, ...values.slice());
    this.triggerResort(this.sortCriteria.slice());
    return true;
  }

  private triggerResort(bak: ISortCriteria | ISortCriteria[] | null) {
    const sortCriterias = this.getSortCriteria();
    const bakMulti = Array.isArray(bak) ? bak : sortCriterias;
    this.fire([Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_DIRTY_ORDER, Ranking.EVENT_DIRTY_HEADER,
      Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], bakMulti, sortCriterias);
  }

  get children() {
    return this.columns.slice();
  }

  get length() {
    return this.columns.length;
  }

  insert(col: Column, index: number = this.columns.length) {
    this.columns.splice(index, 0, col);
    col.parent = this;
    this.forward(col, ...suffix('.ranking', Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY, NumberColumn.EVENT_FILTER_CHANGED));
    col.on(`${Ranking.EVENT_FILTER_CHANGED}.order`, this.dirtyOrder);

    col.on(`${Column.EVENT_VISIBILITY_CHANGED}.ranking`, (oldValue, newValue) => this.fire([Ranking.EVENT_COLUMN_VISIBILITY_CHANGED, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, oldValue, newValue));

    this.fire([Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, index);

    if (this.sortCriteria.length === 0 && !isSupportType(col)) {
      this.sortBy(col, col instanceof StringColumn);
    }
    return col;
  }

  move(col: Column, index: number = this.columns.length) {
    if (col.parent !== this) {
      // not a move operation!
      console.error('invalid move operation: ', col);
      return null;
    }
    const old = this.columns.indexOf(col);
    if (index === old) {
      // no move needed
      return col;
    }
    //delete first
    this.columns.splice(old, 1);
    // adapt target index based on previous index, i.e shift by one
    this.columns.splice(old < index ? index - 1 : index, 0, col);

    this.fire([Ranking.EVENT_MOVE_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, index, old);
    return col;
  }

  moveAfter(col: Column, reference: Column) {
    const i = this.columns.indexOf(reference);
    if (i < 0) {
      return null;
    }
    return this.move(col, i + 1);
  }

  get fqpath() {
    return '';
  }

  findByPath(fqpath: string): Column {
    let p: IColumnParent | Column = <any>this;
    const indices = fqpath.split('@').map(Number).slice(1); //ignore the first entry = ranking
    while (indices.length > 0) {
      const i = indices.shift()!;
      p = (<IColumnParent>p).at(i);
    }
    return <Column>p;
  }

  indexOf(col: Column) {
    return this.columns.indexOf(col);
  }

  at(index: number) {
    return this.columns[index];
  }

  insertAfter(col: Column, ref: Column) {
    const i = this.columns.indexOf(ref);
    if (i < 0) {
      return null;
    }
    return this.insert(col, i + 1);
  }

  push(col: Column) {
    return this.insert(col);
  }

  remove(col: Column) {
    const i = this.columns.indexOf(col);
    if (i < 0) {
      return false;
    }

    this.unforward(col, ...suffix('.ranking', Column.EVENT_VISIBILITY_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY, NumberColumn.EVENT_FILTER_CHANGED));

    const isSortCriteria = this.sortCriteria.findIndex((d) => d.col === col);
    if (isSortCriteria === 0) {
      this.sortCriteria.shift();
      // if multiple ones sort by previous one
      if (this.sortCriteria.length > 0) {
        this.sortBy(this.sortCriteria[0].col);
      } else {
        const next = this.columns.filter((d) => d !== col && !isSupportType(d))[0];
        this.sortBy(next ? next : null);
      }
    } else if (isSortCriteria > 0) {
      // just remove and trigger restore
      this.sortCriteria.splice(isSortCriteria, 1);
      this.triggerResort(null);
    }

    const isGroupColumn = this.groupColumns.indexOf(col);
    if (isGroupColumn >= 0) { // was my grouping criteria
      const newGrouping = this.groupColumns.slice();
      newGrouping.splice(isGroupColumn, 1);
      this.groupBy(newGrouping);
    }

    col.parent = null;
    this.columns.splice(i, 1);

    this.fire([Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], col, i);
    return true;
  }

  clear() {
    if (this.columns.length === 0) {
      return;
    }
    this.sortCriteria.splice(0, this.sortCriteria.length);

    this.groupColumns.forEach((groupColumn) => {
      groupColumn.on(`${Column.EVENT_DIRTY_VALUES}.group`, null);
      groupColumn.on(`${NumberColumn.EVENT_SORTMETHOD_CHANGED}.group`, null);
    });
    this.groupColumns.splice(0, this.groupColumns.length);

    this.columns.forEach((col) => {
      this.unforward(col, ...suffix('.ranking', Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY, NumberColumn.EVENT_FILTER_CHANGED));
      col.parent = null;
    });
    const removed = this.columns.splice(0, this.columns.length);
    this.fire([Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_DIRTY_HEADER, Ranking.EVENT_DIRTY_VALUES, Ranking.EVENT_DIRTY], removed);
  }

  get flatColumns(): Column[] {
    const r: IFlatColumn[] = [];
    this.flatten(r, 0, Column.FLAT_ALL_COLUMNS);
    return r.map((d) => d.col);
  }

  find(idOrFilter: string | ((col: Column) => boolean)) {
    const filter = typeof(idOrFilter) === 'string' ? (col: Column) => col.id === idOrFilter : idOrFilter;
    const r = this.flatColumns;
    for (const v of r) {
      if (filter(v)) {
        return v;
      }
    }
    return null;
  }

  isFiltered() {
    return this.columns.some((d) => d.isFiltered());
  }

  filter(row: IDataRow) {
    return this.columns.every((d) => d.filter(row));
  }

  findMyRanker() {
    return this;
  }

  get fqid() {
    return this.id;
  }
}
