import { parser } from './parser';

const BaseVisitor = parser.getBaseCstVisitorConstructor();

export interface FelContext {
  getSignalValue: (path: string) => any;
  getRepeatsValue: (path: string) => number;
  getRelevantValue: (path: string) => boolean;
  getRequiredValue: (path: string) => boolean;
  getReadonlyValue: (path: string) => boolean;
  currentItemPath: string;
  engine: any;
}

export class FelInterpreter extends BaseVisitor {
  private context!: FelContext;

  constructor() {
    super();
    this.validateVisitor();
  }

  public evaluate(cst: any, context: FelContext) {
    this.context = context;
    return this.visit(cst);
  }

  private felStdLib: Record<string, Function> = {
    sum: (arr: any[]) => {
        if (!Array.isArray(arr)) return 0;
        return arr.reduce((a, b) => {
            const val = typeof b === 'string' ? parseFloat(b) : b;
            return a + (Number.isFinite(val) ? val : 0);
        }, 0);
    },
    upper: (s: string) => (s || '').toUpperCase(),
    round: (n: number, p: number = 0) => {
        const factor = Math.pow(10, p);
        return Math.round(n * factor) / factor;
    },
    year: (d: string) => d ? new Date(d).getFullYear() : null,
    coalesce: (...args: any[]) => args.find(a => a !== null && a !== undefined && a !== ''),
    isNull: (a: any) => a === null || a === undefined || a === '',
    present: (a: any) => a !== null && a !== undefined && a !== '',
    relevant: (path: string) => this.context.getRelevantValue(path),
    required: (path: string) => this.context.getRequiredValue(path),
    readonly: (path: string) => this.context.getReadonlyValue(path),
    contains: (s: string, sub: string) => (s || '').includes(sub || ''),
    abs: (n: number) => Math.abs(n || 0),
    power: (b: number, e: number) => Math.pow(b || 0, e || 0),
    empty: (v: any) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0),
    dateAdd: (d: string, n: number, unit: string) => {
        const date = new Date(d);
        if (unit === 'days') date.setDate(date.getDate() + n);
        else if (unit === 'months') date.setMonth(date.getMonth() + n);
        else if (unit === 'years') date.setFullYear(date.getFullYear() + n);
        return date.toISOString().split('T')[0];
    },
    dateDiff: (d1: string, d2: string, unit: string) => {
        const t1 = new Date(d1).getTime();
        const t2 = new Date(d2).getTime();
        const diff = t1 - t2;
        if (unit === 'days') return Math.floor(diff / (1000 * 60 * 60 * 24));
        return 0;
    },
    count: (arr: any[]) => Array.isArray(arr) ? arr.length : 0,
    avg: (arr: any[]) => {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        const valid = arr.map(a => typeof a === 'string' ? parseFloat(a) : a).filter(a => Number.isFinite(a));
        return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    },
    min: (arr: any[]) => {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        const valid = arr.map(a => typeof a === 'string' ? parseFloat(a) : a).filter(a => Number.isFinite(a));
        return valid.length ? Math.min(...valid) : 0;
    },
    max: (arr: any[]) => {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        const valid = arr.map(a => typeof a === 'string' ? parseFloat(a) : a).filter(a => Number.isFinite(a));
        return valid.length ? Math.max(...valid) : 0;
    },
    length: (s: string) => (s || '').length,
    startsWith: (s: string, sub: string) => (s || '').startsWith(sub || ''),
    endsWith: (s: string, sub: string) => (s || '').endsWith(sub || ''),
    substring: (s: string, start: number, len?: number) => len === undefined ? (s || '').substring(start) : (s || '').substring(start, start + len),
    replace: (s: string, old: string, nw: string) => (s || '').split(old || '').join(nw || ''),
    lower: (s: string) => (s || '').toLowerCase(),
    trim: (s: string) => (s || '').trim(),
    matches: (s: string, pat: string) => new RegExp(pat).test(s || ''),
    floor: (n: number) => Math.floor(n || 0),
    ceil: (n: number) => Math.ceil(n || 0),
    today: () => new Date().toISOString().split('T')[0],
    now: () => new Date().toISOString(),
    month: (d: string) => d ? new Date(d).getMonth() + 1 : null,
    day: (d: string) => d ? new Date(d).getDate() : null,
    hours: (d: string) => d ? new Date(d).getHours() : null,
    minutes: (d: string) => d ? new Date(d).getMinutes() : null,
    seconds: (d: string) => d ? new Date(d).getSeconds() : null,
    time: (d: string) => d ? new Date(d).toTimeString().split(' ')[0] : null,
    selected: (val: any, opt: any) => Array.isArray(val) ? val.includes(opt) : val === opt,
    isNumber: (v: any) => typeof v === 'number' && !isNaN(v),
    isString: (v: any) => typeof v === 'string',
    isDate: (v: any) => !isNaN(Date.parse(v)),
    typeOf: (v: any) => Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v,
    number: (v: any) => { const n = Number(v); return isNaN(n) ? null : n; },
    money: (amount: number, currency: string) => ({ amount, currency }),
    moneyAmount: (m: any) => m && m.amount !== undefined ? m.amount : null,
    moneyCurrency: (m: any) => m && m.currency !== undefined ? m.currency : null,
    prev: (name: string) => {
        const parts = this.context.currentItemPath.split(/[\[\].]/).filter(Boolean);
        let lastNumIndex = -1;
        for (let i = parts.length - 1; i >= 0; i--) {
            if (!isNaN(parseInt(parts[i]))) { lastNumIndex = i; break; }
        }
        if (lastNumIndex === -1) return null;
        const idx = parseInt(parts[lastNumIndex]);
        if (idx <= 0) return null;
        const siblingsPath = parts.slice(0, lastNumIndex).join('.') + `[${idx-1}].` + name;
        return this.context.getSignalValue(siblingsPath);
    },
    next: (name: string) => {
        const parts = this.context.currentItemPath.split(/[\[\].]/).filter(Boolean);
        let lastNumIndex = -1;
        for (let i = parts.length - 1; i >= 0; i--) {
            if (!isNaN(parseInt(parts[i]))) { lastNumIndex = i; break; }
        }
        if (lastNumIndex === -1) return null;
        const idx = parseInt(parts[lastNumIndex]);
        const siblingsPath = parts.slice(0, lastNumIndex).join('.') + `[${idx+1}].` + name;
        return this.context.getSignalValue(siblingsPath);
    },
    parent: (name: string) => {
        const parts = this.context.currentItemPath.split(/[\[\].]/).filter(Boolean);
        for (let i = parts.length - 2; i >= 0; i--) {
            const path = parts.slice(0, i).join('.') + (i > 0 ? '.' : '') + name;
            const val = this.context.getSignalValue(path);
            if (val !== undefined) return val;
        }
        return this.context.getSignalValue(name);
    }
  };

  expression(ctx: any) {
    return this.visit(ctx.letExpr);
  }

  letExpr(ctx: any) {
    if (ctx.Let) {
        // Implement scope/environment for let
        return this.visit(ctx.inExpr);
    }
    return this.visit(ctx.ifExpr);
  }

  ifExpr(ctx: any) {
    if (ctx.If) {
        const condition = this.visit(ctx.condition);
        if (condition) {
            return this.visit(ctx.thenExpr);
        } else {
            return this.visit(ctx.elseExpr);
        }
    }
    return this.visit(ctx.ternary);
  }

  ternary(ctx: any) {
    const val = this.visit(ctx.logicalOr);
    if (ctx.Question) {
        return val ? this.visit(ctx.trueExpr) : this.visit(ctx.falseExpr);
    }
    return val;
  }

  logicalOr(ctx: any) {
    let result = this.visit(ctx.logicalAnd[0]);
    for (let i = 1; i < ctx.logicalAnd.length; i++) {
        result = result || this.visit(ctx.logicalAnd[i]);
    }
    return result;
  }

  logicalAnd(ctx: any) {
    let result = this.visit(ctx.equality[0]);
    for (let i = 1; i < ctx.equality.length; i++) {
        result = result && this.visit(ctx.equality[i]);
    }
    return result;
  }

  equality(ctx: any) {
    let result = this.visit(ctx.comparison[0]);
    for (let i = 1; i < ctx.comparison.length; i++) {
        const next = this.visit(ctx.comparison[i]);
        if (ctx.Equals && ctx.Equals[i-1]) {
            result = result === next;
        } else {
            result = result !== next;
        }
    }
    return result;
  }

  comparison(ctx: any) {
    let result = this.visit(ctx.membership[0]);
    for (let i = 1; i < ctx.membership.length; i++) {
        const next = this.visit(ctx.membership[i]);
        if (ctx.LessEqual && ctx.LessEqual[i-1]) result = result <= next;
        else if (ctx.GreaterEqual && ctx.GreaterEqual[i-1]) result = result >= next;
        else if (ctx.Less && ctx.Less[i-1]) result = result < next;
        else if (ctx.Greater && ctx.Greater[i-1]) result = result > next;
    }
    return result;
  }

  membership(ctx: any) {
    const val = this.visit(ctx.nullCoalesce[0]);
    if (ctx.In || ctx.Not) {
        const list = this.visit(ctx.nullCoalesce[1]);
        const isIn = Array.isArray(list) ? list.includes(val) : false;
        return ctx.Not ? !isIn : isIn;
    }
    return val;
  }

  nullCoalesce(ctx: any) {
    let result = this.visit(ctx.addition[0]);
    for (let i = 1; i < ctx.addition.length; i++) {
        result = result ?? this.visit(ctx.addition[i]);
    }
    return result;
  }

  addition(ctx: any) {
    let result = this.visit(ctx.multiplication[0]);
    for (let i = 1; i < ctx.multiplication.length; i++) {
        const next = this.visit(ctx.multiplication[i]);
        if (ctx.Plus && ctx.Plus[i-1]) result = result + next;
        else if (ctx.Minus && ctx.Minus[i-1]) result = result - next;
        else if (ctx.Ampersand && ctx.Ampersand[i-1]) result = String(result) + String(next);
    }
    return result;
  }

  multiplication(ctx: any) {
    let result = this.visit(ctx.unary[0]);
    for (let i = 1; i < ctx.unary.length; i++) {
        const next = this.visit(ctx.unary[i]);
        if (ctx.Asterisk && ctx.Asterisk[i-1]) result = result * next;
        else if (ctx.Slash && ctx.Slash[i-1]) result = result / next;
        else if (ctx.Percent && ctx.Percent[i-1]) result = result % next;
    }
    return result;
  }

  unary(ctx: any) {
    if (ctx.Not) {
        return !this.visit(ctx.unary);
    }
    if (ctx.Minus) {
        return -this.visit(ctx.unary);
    }
    return this.visit(ctx.postfix);
  }

  postfix(ctx: any) {
    let val = this.visit(ctx.atom);
    if (ctx.pathTail) {
        for (const tail of ctx.pathTail) {
            // postfix resolution
        }
    }
    return val;
  }

  pathTail(ctx: any) {
    if (ctx.Identifier) return ctx.Identifier[0].image;
    if (ctx.NumberLiteral) return parseInt(ctx.NumberLiteral[0].image);
    return '*';
  }

  atom(ctx: any) {
    if (ctx.literal) return this.visit(ctx.literal);
    if (ctx.fieldRef) return this.visit(ctx.fieldRef);
    if (ctx.functionCall) return this.visit(ctx.functionCall);
    if (ctx.ifCall) return this.visit(ctx.ifCall);
    if (ctx.expression) return this.visit(ctx.expression);
    if (ctx.arrayLiteral) return this.visit(ctx.arrayLiteral);
    if (ctx.objectLiteral) return this.visit(ctx.objectLiteral);
    return null;
  }

  literal(ctx: any) {
    if (ctx.NumberLiteral) return parseFloat(ctx.NumberLiteral[0].image);
    if (ctx.StringLiteral) {
        const str = ctx.StringLiteral[0].image;
        return str.substring(1, str.length - 1);
    }
    if (ctx.True) return true;
    if (ctx.False) return false;
    if (ctx.Null) return null;
    if (ctx.DateLiteral) return ctx.DateLiteral[0].image.substring(1);
    if (ctx.DateTimeLiteral) return ctx.DateTimeLiteral[0].image.substring(1);
  }

  fieldRef(ctx: any) {
    if (ctx.Dollar) {
        let name = ctx.Identifier ? ctx.Identifier[0].image : '';
        if (ctx.pathTail) {
            // Chained path
            for (const tail of ctx.pathTail) {
                const tailVal = this.visit(tail);
                name += (name ? '.' : '') + tailVal;
            }
        }
        
        // Use PathResolver logic
        const parts = this.context.currentItemPath.split(/[.\[\]]/).filter(Boolean);
        const parentPath = parts.slice(0, -1).join('.');
        const fullPath = parentPath ? `${parentPath}.${name}` : name;
        
        if (name === '') return this.context.getSignalValue(this.context.currentItemPath);
        
        let val = this.context.getSignalValue(fullPath);
        if (val === undefined) {
            val = this.context.getSignalValue(name);
        }
        return val;
    }
    if (ctx.contextRef) return this.visit(ctx.contextRef);
    if (ctx.Identifier) {
        let name = ctx.Identifier[0].image;
        if (ctx.pathTail) {
            for (const tail of ctx.pathTail) {
                const tailVal = this.visit(tail);
                name += (name ? '.' : '') + tailVal;
            }
        }
        const parts = this.context.currentItemPath.split(/[.\[\]]/).filter(Boolean);
        const parentPath = parts.slice(0, -1).join('.');
        const fullPath = parentPath ? `${parentPath}.${name}` : name;
        
        let val = this.context.getSignalValue(fullPath);
        if (val === undefined) {
            val = this.context.getSignalValue(name);
        }
        return val;
    }
  }

  contextRef(ctx: any) {
    const ident = ctx.Identifier[0].image;
    if (ident === 'index') {
        const parts = this.context.currentItemPath.split(/[\[\]]/).filter(p => !isNaN(parseInt(p)));
        return parts.length > 0 ? parseInt(parts[parts.length - 1]) + 1 : 1; // 1-based as per spec
    }
    if (ident === 'current') {
        return this.context.getSignalValue(this.context.currentItemPath);
    }
    return null;
  }

  functionCall(ctx: any) {
    const name = ctx.Identifier[0].image;
    const args = ctx.argList ? this.visit(ctx.argList) : [];
    const fn = this.felStdLib[name];
    if (fn) return fn(...args);
    return null;
  }

  ifCall(ctx: any) {
    const args = ctx.argList ? this.visit(ctx.argList) : [];
    return args[0] ? args[1] : args[2];
  }

  argList(ctx: any) {
    return ctx.expression.map((e: any) => this.visit(e));
  }

  arrayLiteral(ctx: any) {
    return ctx.expression ? ctx.expression.map((e: any) => this.visit(e)) : [];
  }

  objectLiteral(ctx: any) {
    const obj: any = {};
    if (ctx.objectEntries) {
        const entries = this.visit(ctx.objectEntries);
        for (const entry of entries) {
            obj[entry.key] = entry.value;
        }
    }
    return obj;
  }

  objectEntries(ctx: any) {
    return ctx.objectEntry.map((e: any) => this.visit(e));
  }

  objectEntry(ctx: any) {
    const key = ctx.Identifier ? ctx.Identifier[0].image : ctx.StringLiteral[0].image.slice(1, -1);
    const value = this.visit(ctx.expression);
    return { key, value };
  }
}

export const interpreter = new FelInterpreter();
