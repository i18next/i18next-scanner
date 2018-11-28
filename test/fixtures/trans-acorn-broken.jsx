import { Fragment } from 'react';

// Provoke an acorn parsing error by inserting a `async` keyword in a wrong place. This should lead
// to no translateions being extracted from this file.
const async Component = () => (
    <Fragment>
          <Trans>Broken</Trans>
    </Fragment>
);

export default Component;
