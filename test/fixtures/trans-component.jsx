import { Fragment } from 'react';

const CustomTrans = props => (
    <div>
        <Trans {...props} />
    </div>
);

const Whatever = () => null;

const Component = () => (
    <Fragment>
        <Trans i18nKey='default'>Default Trans component</Trans>
        <CustomTrans i18nKey='custom'>Customized Trans component</CustomTrans>
        <Whatever i18nKey='fake-trans'>Not a translation</Whatever>
    </Fragment>
);

export default Component;
