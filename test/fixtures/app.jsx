const mycomp = () => (
    <React.Fragment>
        <Trans i18nKey="key1">Key 1 default</Trans>
        <Trans i18nKey="key2">
            Key 2
            default value
        </Trans>

        <Trans i18nKey="key3">This is a <strong>test</strong></Trans>
        <Trans i18nKey="key4" count={count}>You have {{count}} apples</Trans>
        <Trans i18nKey="key5">You have <a>one <i>very</i> bad</a> apple</Trans>
        <Trans i18nKey="key6">This is a <strong>{{test}}</strong></Trans>
        <Trans>key7 default</Trans>
        <Trans count={1}>key8 default {{count}}</Trans>
        <Trans>We can use Trans without i18nKey="..." as well!</Trans>
        <Trans i18nKey="key9" context="male">A boyfriend</Trans>
        <I18N __t="key10">A wrapper component with key</I18N>
        <I18N>A wrapper component without key</I18N>
    </React.Fragment>
)
