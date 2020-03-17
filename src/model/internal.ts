import {schemeCategory10, schemeSet3} from 'd3-scale-chromatic';
import Column, {defaultGroup, IGroup, IGroupParent, IndicesArray, IOrderedGroup, ECompareValueType} from '.';
import {OrderedSet} from '../internal';
import {DEFAULT_COLOR} from './interfaces';


/** @internal */
export function integrateDefaults<T>(desc: T, defaults: Partial<T> = {}) {
  Object.keys(defaults).forEach((key) => {
    const typed = <keyof T>key;
    if (typeof desc[typed] === 'undefined') {
      (<any>desc)[typed] = defaults[typed];
    };
  })
  return desc;
}

/** @internal */
export function patternFunction(pattern: string, ...args: string[]) {
  return new Function('value', ...args, `
  const escapedValue = encodeURIComponent(String(value));
  return \`${pattern}\`;
 `);
}


/** @internal */
export function joinGroups(groups: IGroup[]): IGroup {
  if (groups.length === 0) {
    return {...defaultGroup}; //copy
  }
  if (groups.length === 1 && !groups[0].parent) {
    return {...groups[0]}; //copy
  }
  // create a chain
  const parents: IGroupParent[] = [];
  for (const group of groups) {
    const gparents: IGroupParent[] = [];
    let g = group;
    while (g.parent) {
      // add all parents of this groups
      gparents.unshift(g.parent);
      g = g.parent;
    }
    parents.push(...gparents);
    parents.push(Object.assign({subGroups: []}, group));
  }
  parents.slice(1).forEach((g, i) => {
    g.parent = parents[i];
    g.name = `${parents[i].name} ∩ ${g.name}`;
    g.color = g.color !== DEFAULT_COLOR ? g.color : g.parent.color;
    parents[i].subGroups = [g];
  });

  return parents[parents.length - 1];
}

export function duplicateGroup<T extends IOrderedGroup | IGroupParent>(group: T) {
  const clone = <T>Object.assign({}, group);
  delete (<IOrderedGroup>clone).order;
  if (isGroupParent(<any>clone)) {
    (<any>clone).subGroups = [];
  }
  if (clone.parent) {
    clone.parent = duplicateGroup(clone.parent);
    clone.parent!.subGroups.push(clone);
  }
  return clone;
}

/** @internal */
export function toGroupID(group: IGroup) {
  return group.name;
}

/** @internal */
export function isOrderedGroup(g: IOrderedGroup | Readonly<IGroupParent>): g is IOrderedGroup {
  return (<IOrderedGroup>g).order != null;
}


/** @internal */
function isGroupParent(g: IOrderedGroup | Readonly<IGroupParent>): g is IGroupParent {
  return (<IGroupParent>g).subGroups != null;
}

/**
 * unify the parents of the given groups by reusing the same group parent if possible
 * @param groups
 */
export function unifyParents<T extends IOrderedGroup>(groups: T[]) {
  if (groups.length <= 1) {
    return groups;
  }

  const toPath = (group: T) => {
    const path: (IGroupParent | T)[] = [group];
    let p = group.parent;
    while (p) {
      path.unshift(p);
      p = p.parent;
    }
    return path;
  };
  const paths = groups.map(toPath);

  const isSame = (a: IGroupParent, b: (IGroupParent | T)) => {
    return (b.name === a.name && b.parent === a.parent && isGroupParent(b) && b.subGroups.length > 0);
  };

  const removeDuplicates = (level: (IGroupParent | T)[], i: number) => {
    const real: (IGroupParent | T)[] = [];
    while (level.length > 0) {
      const node = level.shift()!;
      if (!isGroupParent(node) || node.subGroups.length === 0) { // cannot share leaves
        real.push(node);
        continue;
      }
      const root = {...node};
      real.push(root);
      // remove duplicates that directly follow
      while (level.length > 0 && isSame(root, level[0]!)) {
        root.subGroups.push(...(<IGroupParent>level.shift()!).subGroups);
      }
      for (const child of root.subGroups) {
        (<(IGroupParent | T)>child).parent = root;
      }
      // cleanup children duplicates
      root.subGroups = removeDuplicates(<(IGroupParent | T)[]>root.subGroups, i + 1);
    }
    return real;
  };

  removeDuplicates(paths.map((p) => p[0]), 0);

  return groups;
}

/** @internal */
export function groupRoots(groups: IOrderedGroup[]) {
  const roots = new OrderedSet<IOrderedGroup | Readonly<IGroupParent>>();
  for (const group of groups) {
    let root: IOrderedGroup | Readonly<IGroupParent> = group;
    while (root.parent) {
      root = root.parent;
    }
    roots.add(root);
  }
  return Array.from(roots);
}


// based on https://github.com/d3/d3-scale-chromatic#d3-scale-chromatic
const colors = schemeCategory10.concat(schemeSet3);

/** @internal */
export const MAX_COLORS = colors.length;

/** @internal */
export function colorPool() {
  let act = 0;
  return () => colors[(act++) % colors.length];
}


/**
 * @internal
 */
export function mapIndices<T>(arr: IndicesArray, callback: (value: number, i: number) => T): T[] {
  const r: T[] = [];
  for (let i = 0; i < arr.length; ++i) {
    r.push(callback(arr[i], i));
  }
  return r;
}

/**
 * @internal
 */
export function everyIndices(arr: IndicesArray, callback: (value: number, i: number) => boolean): boolean {
  for (let i = 0; i < arr.length; ++i) {
    if (!callback(arr[i], i)) {
      return false;
    }
  }
  return true;
}

/**
 * @internal
 */
export function filterIndices(arr: IndicesArray, callback: (value: number, i: number) => boolean): number[] {
  const r: number[] = [];
  for (let i = 0; i < arr.length; ++i) {
    if (callback(arr[i], i)) {
      r.push(arr[i]);
    }
  }
  return r;
}


/**
 * @internal
 */
export function forEachIndices(arr: IndicesArray, callback: (value: number, i: number) => void) {
  for (let i = 0; i < arr.length; ++i) {
    callback(arr[i], i);
  }
}

/**
 * @internal
 */
export function chooseUIntByDataLength(dataLength?: number | null) {
  if (dataLength == null || typeof dataLength !== 'number' && !isNaN(dataLength)) {
    return ECompareValueType.UINT32; // worst case
  }
  if (length <= 255) {
    return ECompareValueType.UINT8;
  }
  if (length <= 65535) {
    return ECompareValueType.UINT16;
  }
  return ECompareValueType.UINT32;
}


// side effect
const cache = new Map<string, string[]>();


export function getAllToolbarActions(col: Column) {
  if (cache.has(col.desc.type)) {
    return cache.get(col.desc.type)!;
  }
  const actions = new OrderedSet<string>();

  // walk up the prototype chain
  let obj = <any>col;
  const toolbarIcon = Symbol.for('toolbarIcon');
  do {
    const m = <string[]>Reflect.getOwnMetadata(toolbarIcon, obj.constructor);
    if (m) {
      for (const mi of m) {
        actions.add(mi);
      }
    }
    obj = Object.getPrototypeOf(obj);
  } while (obj);
  const arr = Array.from(actions);
  cache.set(col.desc.type, arr);
  return arr;
}


export function getAllToolbarDialogAddons(col: Column, key: string) {
  const cacheKey = `${col.desc.type}@${key}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }
  const actions = new OrderedSet<string>();

  // walk up the prototype chain
  let obj = <any>col;
  const symbol = Symbol.for(`toolbarDialogAddon${key}`);
  do {
    const m = <string[]>Reflect.getOwnMetadata(symbol, obj.constructor);
    if (m) {
      for (const mi of m) {
        actions.add(mi);
      }
    }
    obj = Object.getPrototypeOf(obj);
  } while (obj);
  cache.set(cacheKey, Array.from(actions));
  const arr = Array.from(actions);
  cache.set(cacheKey, arr);
  return arr;
}
