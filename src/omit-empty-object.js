import isPlainObject from 'lodash/isPlainObject';
import cloneDeep from 'clone-deep';

// omitEmptyObject({
//   a: {
//     b: {
//       c: 1,
//       d: {
//         e: {
//         }
//       }
//     }
//   }
// });
//
// { a: { b: { c: 1 } } }
//
const unsetEmptyObject = (obj) => {
    Object.keys(obj).forEach(key => {
        if (!isPlainObject(obj[key])) {
            return;
        }

        unsetEmptyObject(obj[key]);
        if (isPlainObject(obj[key]) && Object.keys(obj[key]).length === 0) {
            obj[key] = undefined;
            delete obj[key];
        }
    });

    return obj;
};

const omitEmptyObject = (obj) => unsetEmptyObject(cloneDeep(obj));

export default omitEmptyObject;
