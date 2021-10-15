i18n.t('property in template literals', {
    defaultValue: `property in template literals`
});

i18n.t(`added {{foo}}
 and {{bar}}`);

// Embedded expressions in template literals will be ignored
i18n.t(`errors.${e.errors[key].result}`)
i18n.t(`errors.${defaultError}`)
i18n.t(`string text
 ${expression} string text`);
i18n.t('good_key', `errors.${defaultError}`);
