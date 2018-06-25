import { test } from 'tap';
import jsxToString from '../src/jsx-to-string';

test('JSX to i18next', (t) => {
    t.same(jsxToString('Basic text'), 'Basic text');
    t.same(jsxToString('Hello, {{name}}'), 'Hello, <1>{{name}}</1>');
    t.same(jsxToString('I agree to the <Link>terms</Link>.'), 'I agree to the <1>terms</1>.');
    t.same(jsxToString('One &amp; two'), 'One & two');
    t.end();
});

test('HTML entities', (t) => {
    t.same(jsxToString('Don&apos;t do this <strong>Dave</strong>'), 'Don\'t do this <1>Dave</1>');
    t.end();
});

