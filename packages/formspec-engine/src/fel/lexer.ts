import { createToken, Lexer } from 'chevrotain';

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED
});

export const Comment = createToken({
  name: 'Comment',
  pattern: /\/\/.*/,
  group: Lexer.SKIPPED
});

export const BlockComment = createToken({
  name: 'BlockComment',
  pattern: /\/\*[\s\S]*?\*\//,
  group: Lexer.SKIPPED
});

export const True = createToken({ name: 'True', pattern: /true\b/ });
export const False = createToken({ name: 'False', pattern: /false\b/ });
export const Null = createToken({ name: 'Null', pattern: /null\b/ });

export const And = createToken({ name: 'And', pattern: /and\b/ });
export const Or = createToken({ name: 'Or', pattern: /or\b/ });
export const Not = createToken({ name: 'Not', pattern: /not\b/ });
export const In = createToken({ name: 'In', pattern: /in\b/ });

export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/
});

export const If = createToken({ name: 'If', pattern: /if\b/, categories: [Identifier] });
export const Then = createToken({ name: 'Then', pattern: /then\b/ });
export const Else = createToken({ name: 'Else', pattern: /else\b/ });
export const Let = createToken({ name: 'Let', pattern: /let\b/ });

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/
});

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?/
});

export const DateTimeLiteral = createToken({
  name: 'DateTimeLiteral',
  pattern: /@\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})?/
});

export const DateLiteral = createToken({
  name: 'DateLiteral',
  pattern: /@\d{4}-\d{2}-\d{2}/
});

export const LRound = createToken({ name: 'LRound', pattern: /\(/ });
export const RRound = createToken({ name: 'RRound', pattern: /\)/ });
export const LSquare = createToken({ name: 'LSquare', pattern: /\[/ });
export const RSquare = createToken({ name: 'RSquare', pattern: /\]/ });
export const LCurly = createToken({ name: 'LCurly', pattern: /\{/ });
export const RCurly = createToken({ name: 'RCurly', pattern: /\}/ });

export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Dot = createToken({ name: 'Dot', pattern: /\./ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Question = createToken({ name: 'Question', pattern: /\?/ });
export const DoubleQuestion = createToken({ name: 'DoubleQuestion', pattern: /\?\?/ });

export const Equals = createToken({ name: 'Equals', pattern: /==?/ });
export const NotEquals = createToken({ name: 'NotEquals', pattern: /!=/ });
export const LessEqual = createToken({ name: 'LessEqual', pattern: /<=/ });
export const GreaterEqual = createToken({ name: 'GreaterEqual', pattern: />=/ });
export const Less = createToken({ name: 'Less', pattern: /</ });
export const Greater = createToken({ name: 'Greater', pattern: />/ });

export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Ampersand = createToken({ name: 'Ampersand', pattern: /&/ });
export const Asterisk = createToken({ name: 'Asterisk', pattern: /\*/ });
export const Slash = createToken({ name: 'Slash', pattern: /\// });
export const Percent = createToken({ name: 'Percent', pattern: /%/ });

export const Dollar = createToken({ name: 'Dollar', pattern: /\$/ });
export const At = createToken({ name: 'At', pattern: /@/ });

export const allTokens = [
  WhiteSpace,
  Comment,
  BlockComment,
  DateTimeLiteral,
  DateLiteral,
  NumberLiteral,
  StringLiteral,
  True,
  False,
  Null,
  And,
  Or,
  Not,
  In,
  If,
  Then,
  Else,
  Let,
  LRound,
  RRound,
  LSquare,
  RSquare,
  LCurly,
  RCurly,
  Comma,
  Dot,
  Colon,
  DoubleQuestion,
  Question,
  Equals,
  NotEquals,
  LessEqual,
  GreaterEqual,
  Less,
  Greater,
  Plus,
  Minus,
  Ampersand,
  Asterisk,
  Slash,
  Percent,
  Dollar,
  At,
  Identifier
];

export const FelLexer = new Lexer(allTokens);
