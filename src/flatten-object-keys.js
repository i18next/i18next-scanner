import isPlainObject from 'lodash/isPlainObject';

// flattenObjectKeys({
//   a: {
//     b: {
//       c: [],
//       d: {
//         e: [{ f: [] }, { b: 1 }],
//         g: {}
//       }
//     }
//   }
// });
//
// [ [ 'a', 'b', 'c' ],
//   [ 'a', 'b', 'd', 'e', '0', 'f' ],
//   [ 'a', 'b', 'd', 'e', '1', 'b' ],
//   [ 'a', 'b', 'd', 'g' ] ]
//
const flattenObjectKeys = (obj, keys = []) => {
    return Object.keys(obj).reduce((acc, key) => {
        const o = ((isPlainObject(obj[key]) && Object.keys(obj[key]).length > 0) || (Array.isArray(obj[key]) && obj[key].length > 0))
            ? flattenObjectKeys(obj[key], keys.concat(key))
            : [keys.concat(key)];
        return acc.concat(o);
    }, []);
};

export default flattenObjectKeys;
