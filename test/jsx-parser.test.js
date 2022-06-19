import { Parser } from 'acorn';
import jsx from 'acorn-jsx';
import ensureArray from 'ensure-array';
import _get from 'lodash/get';
import nodesToString from '../src/nodes-to-string';

const jsxToString = (code) => {
  try {
    const ast = Parser.extend(jsx()).parse(`<Trans>${code}</Trans>`, { ecmaVersion: 2020 });

    const nodes = ensureArray(_get(ast, 'body[0].expression.children'));
    if (nodes.length === 0) {
      return '';
    }

    return nodesToString(nodes, code);
  } catch (e) {
    console.error(e);
    return '';
  }
};

test('JSX to i18next', () => {
  expect(jsxToString('Basic text')).toBe('Basic text');
  expect(jsxToString('Hello, {{name}}')).toBe('Hello, <1>{{name}}</1>');
  expect(jsxToString('I agree to the <Link>terms</Link>.')).toBe('I agree to the <1>terms</1>.');
  expect(jsxToString('One &amp; two')).toBe('One & two');
});

test('HTML entities', () => {
  expect(jsxToString('Don&apos;t do this <strong>Dave</strong>')).toBe('Don\'t do this <1>Dave</1>');
});
