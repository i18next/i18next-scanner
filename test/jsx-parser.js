import { test } from 'tap';
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

test('JSX to i18next', (t) => {
    t.same(jsxToString('Basic text'), 'Basic text');
    t.same(jsxToString('Hello, {{name}}'), 'Hello, {{name}}');
    t.same(jsxToString('I agree to the <Link>terms</Link>.'), 'I agree to the <1>terms</1>.');
    t.same(jsxToString('One &amp; two'), 'One & two');
    t.end();
});

test('HTML entities', (t) => {
    t.same(jsxToString('Don&apos;t do this <strong>Dave</strong>'), 'Don\'t do this <1>Dave</1>');
    t.end();
});

