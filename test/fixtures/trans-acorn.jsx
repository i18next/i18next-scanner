import { Fragment } from 'react';

class Component extends React.Component {
    // noop just to see if acorn can parse this
    state = {
    };

    static async onClick(
      a,
      b,
      ...args
    ) {
        console.log(a, b, ...args);
        // noop just to see if acorn can parse this
    }

    render() {
        // This does not work yet.
        const spreadProps = {
          i18nKey: 'spread',
        };

        return (
            <Fragment>
                {
                    // Empty expression should not fail
                }
                <>
                    <Trans i18nKey="simple">Simple i18nKey</Trans>
                    <Trans {...spreadProps}>Spread i18nKey</Trans>
                </>
            </Fragment>
        );
    }
}

export default Component;
