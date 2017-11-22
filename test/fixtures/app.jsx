const mycomp = () => (
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
)
